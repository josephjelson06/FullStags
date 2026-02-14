
from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Sequence, Tuple

import httpx
from ortools.constraint_solver import pywrapcp, routing_enums_pb2
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..events.bus import emit_event
from ..models.delivery import Delivery, DeliveryEtaLog, DeliveryStop
from ..models.inventory import PartsCatalog
from ..models.orders import Order, OrderAssignment, OrderItem
from ..models.users import BuyerProfile, SupplierProfile

logger = logging.getLogger(__name__)

ORS_DIRECTIONS_URL = "https://api.openrouteservice.org/v2/directions/driving-car"
ORS_MATRIX_URL = "https://api.openrouteservice.org/v2/matrix/driving-car"


@dataclass
class AssignmentContext:
    assignment: OrderAssignment
    order_item: OrderItem
    order: Order
    catalog: Optional[PartsCatalog]
    supplier: SupplierProfile
    buyer: BuyerProfile


def _as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _required_delivery(order: Order, fallback_hours: int = 24) -> datetime:
    if order.required_delivery_date is None:
        return datetime.now(timezone.utc) + timedelta(hours=fallback_hours)
    return _as_utc(order.required_delivery_date)


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _fallback_route(origin_lat: float, origin_lng: float, dest_lat: float, dest_lng: float) -> Dict:
    distance_km = _haversine_km(origin_lat, origin_lng, dest_lat, dest_lng) * 1.3
    duration_minutes = (distance_km / 45.0) * 60.0
    return {
        "distance_km": distance_km,
        "duration_minutes": duration_minutes,
        "geometry": {
            "type": "LineString",
            "coordinates": [[origin_lng, origin_lat], [dest_lng, dest_lat]],
        },
    }


def _lead_hours(context: AssignmentContext) -> float:
    if context.catalog is None:
        return 0.0
    return float(context.catalog.lead_time_hours or 0.0)


def _parse_route_geometry(route_geometry: Optional[str]) -> Optional[Dict]:
    if not route_geometry:
        return None
    try:
        parsed = json.loads(route_geometry)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        logger.exception("Invalid stored route geometry")
    return None


def _savings_percent(naive_distance: float, optimized_distance: float) -> float:
    if naive_distance <= 0:
        return 0.0
    return max(0.0, ((naive_distance - optimized_distance) / naive_distance) * 100.0)


async def compute_single_route(
    origin_lat: float,
    origin_lng: float,
    dest_lat: float,
    dest_lng: float,
) -> Dict:
    if origin_lat == dest_lat and origin_lng == dest_lng:
        return {
            "distance_km": 0.0,
            "duration_minutes": 0.0,
            "geometry": {
                "type": "LineString",
                "coordinates": [[origin_lng, origin_lat], [dest_lng, dest_lat]],
            },
        }

    ors_api_key = os.getenv("ORS_API_KEY")
    if not ors_api_key:
        logger.warning("ORS_API_KEY not set. Falling back to Haversine route estimate.")
        return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)

    params = {
        "start": f"{origin_lng},{origin_lat}",
        "end": f"{dest_lng},{dest_lat}",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(
                ORS_DIRECTIONS_URL,
                params=params,
                headers={"Authorization": ors_api_key},
            )
            response.raise_for_status()
            data = response.json()

        feature = (data.get("features") or [])[0]
        summary = feature.get("properties", {}).get("summary", {})
        geometry = feature.get("geometry") or {
            "type": "LineString",
            "coordinates": [[origin_lng, origin_lat], [dest_lng, dest_lat]],
        }

        return {
            "distance_km": float(summary.get("distance", 0.0)) / 1000.0,
            "duration_minutes": float(summary.get("duration", 0.0)) / 60.0,
            "geometry": geometry,
        }
    except Exception:
        logger.exception("ORS directions failed. Falling back to Haversine route estimate.")
        return _fallback_route(origin_lat, origin_lng, dest_lat, dest_lng)


async def compute_distance_matrix(locations: List[Tuple[float, float]]) -> List[List[float]]:
    if not locations:
        return []

    ors_api_key = os.getenv("ORS_API_KEY")
    if not ors_api_key:
        logger.warning("ORS_API_KEY not set. Falling back to Haversine matrix estimate.")
        return _fallback_duration_matrix(locations)

    ors_locations = [[lng, lat] for lat, lng in locations]
    payload = {
        "locations": ors_locations,
        "metrics": ["duration"],
    }

    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            response = await client.post(
                ORS_MATRIX_URL,
                json=payload,
                headers={"Authorization": ors_api_key},
            )
            response.raise_for_status()
            data = response.json()

        durations = data.get("durations")
        if not durations:
            raise ValueError("No durations returned from ORS matrix")

        matrix: List[List[float]] = []
        for row in durations:
            matrix_row: List[float] = []
            for value in row:
                matrix_row.append(float(value or 0.0))
            matrix.append(matrix_row)
        return matrix
    except Exception:
        logger.exception("ORS matrix failed. Falling back to Haversine matrix estimate.")
        return _fallback_duration_matrix(locations)


def _fallback_duration_matrix(locations: List[Tuple[float, float]]) -> List[List[float]]:
    matrix: List[List[float]] = []
    for from_lat, from_lng in locations:
        row: List[float] = []
        for to_lat, to_lng in locations:
            if from_lat == to_lat and from_lng == to_lng:
                row.append(0.0)
                continue
            km = _haversine_km(from_lat, from_lng, to_lat, to_lng) * 1.3
            seconds = (km / 45.0) * 3600.0
            row.append(seconds)
        matrix.append(row)
    return matrix


def solve_vrp(
    distance_matrix: List[List[float]],
    pickups_deliveries: List[Tuple[int, int]],
    time_windows: List[Tuple[int, int]],
    num_vehicles: int = 3,
) -> List[List[int]]:
    if not distance_matrix:
        return []

    manager = pywrapcp.RoutingIndexManager(len(distance_matrix), num_vehicles, 0)
    routing = pywrapcp.RoutingModel(manager)

    def distance_callback(from_index: int, to_index: int) -> int:
        from_node = manager.IndexToNode(from_index)
        to_node = manager.IndexToNode(to_index)
        return int(distance_matrix[from_node][to_node])

    transit_callback_index = routing.RegisterTransitCallback(distance_callback)
    routing.SetArcCostEvaluatorOfAllVehicles(transit_callback_index)

    horizon = max((end for _, end in time_windows), default=24 * 60 * 60)
    routing.AddDimension(
        transit_callback_index,
        30 * 60,
        int(horizon),
        False,
        "Time",
    )
    time_dimension = routing.GetDimensionOrDie("Time")

    for node, (start, end) in enumerate(time_windows):
        index = manager.NodeToIndex(node)
        end_value = max(start, end)
        time_dimension.CumulVar(index).SetRange(int(start), int(end_value))

    for pickup_node, delivery_node in pickups_deliveries:
        pickup_index = manager.NodeToIndex(pickup_node)
        delivery_index = manager.NodeToIndex(delivery_node)
        routing.AddPickupAndDelivery(pickup_index, delivery_index)
        routing.solver().Add(routing.VehicleVar(pickup_index) == routing.VehicleVar(delivery_index))
        routing.solver().Add(time_dimension.CumulVar(pickup_index) <= time_dimension.CumulVar(delivery_index))

    search_parameters = pywrapcp.DefaultRoutingSearchParameters()
    search_parameters.first_solution_strategy = routing_enums_pb2.FirstSolutionStrategy.PATH_CHEAPEST_ARC
    search_parameters.local_search_metaheuristic = routing_enums_pb2.LocalSearchMetaheuristic.GUIDED_LOCAL_SEARCH
    search_parameters.time_limit.seconds = 5

    solution = routing.SolveWithParameters(search_parameters)
    if solution is None:
        raise ValueError("No VRP solution found")

    routes: List[List[int]] = []
    for vehicle_id in range(num_vehicles):
        index = routing.Start(vehicle_id)
        route_nodes: List[int] = []
        while not routing.IsEnd(index):
            route_nodes.append(manager.IndexToNode(index))
            index = solution.Value(routing.NextVar(index))
        route_nodes.append(manager.IndexToNode(index))

        if len(route_nodes) > 2 and any(node != 0 for node in route_nodes):
            routes.append(route_nodes)

    return routes

async def _load_assignment_contexts(
    session: AsyncSession,
    order_assignment_ids: Sequence[int],
) -> List[AssignmentContext]:
    unique_ids = list(dict.fromkeys(order_assignment_ids))
    if not unique_ids:
        return []

    stmt = (
        select(OrderAssignment, OrderItem, Order, PartsCatalog, SupplierProfile, BuyerProfile)
        .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
        .join(Order, Order.id == OrderItem.order_id)
        .outerjoin(PartsCatalog, PartsCatalog.id == OrderAssignment.catalog_id)
        .join(SupplierProfile, SupplierProfile.id == OrderAssignment.supplier_id)
        .join(BuyerProfile, BuyerProfile.id == Order.buyer_id)
        .where(OrderAssignment.id.in_(unique_ids))
    )

    rows = (await session.execute(stmt)).all()
    contexts_by_id: Dict[int, AssignmentContext] = {}
    for assignment, order_item, order, catalog, supplier, buyer in rows:
        contexts_by_id[assignment.id] = AssignmentContext(
            assignment=assignment,
            order_item=order_item,
            order=order,
            catalog=catalog,
            supplier=supplier,
            buyer=buyer,
        )

    missing = [assignment_id for assignment_id in unique_ids if assignment_id not in contexts_by_id]
    if missing:
        raise ValueError(f"Order assignments not found: {missing}")

    return [contexts_by_id[assignment_id] for assignment_id in unique_ids]


def _context_event_targets(contexts: List[AssignmentContext]) -> List[int]:
    user_ids = set()
    for context in contexts:
        if context.buyer.user_id:
            user_ids.add(context.buyer.user_id)
        if context.supplier.user_id:
            user_ids.add(context.supplier.user_id)
    return sorted(user_ids)


def _centroid(points: List[Tuple[float, float]]) -> Tuple[float, float]:
    if not points:
        return (0.0, 0.0)
    lat = sum(point[0] for point in points) / len(points)
    lng = sum(point[1] for point in points) / len(points)
    return (lat, lng)


async def _chain_route_points(points: List[Tuple[float, float]]) -> Dict:
    if len(points) <= 1:
        point = points[0] if points else (0.0, 0.0)
        return {
            "distance_km": 0.0,
            "duration_minutes": 0.0,
            "geometry": {"type": "LineString", "coordinates": [[point[1], point[0]]]},
            "segment_durations": [],
        }

    total_distance = 0.0
    total_duration = 0.0
    combined_coords: List[List[float]] = []
    segment_durations: List[float] = []

    for idx in range(len(points) - 1):
        origin_lat, origin_lng = points[idx]
        dest_lat, dest_lng = points[idx + 1]
        segment = await compute_single_route(origin_lat, origin_lng, dest_lat, dest_lng)

        total_distance += float(segment["distance_km"])
        total_duration += float(segment["duration_minutes"])
        segment_durations.append(float(segment["duration_minutes"]))

        segment_geometry = segment.get("geometry") or {}
        segment_coords = segment_geometry.get("coordinates") or [[origin_lng, origin_lat], [dest_lng, dest_lat]]

        if not combined_coords:
            combined_coords.extend(segment_coords)
        elif combined_coords[-1] == segment_coords[0]:
            combined_coords.extend(segment_coords[1:])
        else:
            combined_coords.extend(segment_coords)

    return {
        "distance_km": total_distance,
        "duration_minutes": total_duration,
        "geometry": {"type": "LineString", "coordinates": combined_coords},
        "segment_durations": segment_durations,
    }


async def _build_delivery_response(session: AsyncSession, delivery: Delivery) -> Dict:
    stops = (
        await session.execute(
            select(DeliveryStop)
            .where(DeliveryStop.delivery_id == delivery.id)
            .order_by(DeliveryStop.sequence_order)
        )
    ).scalars().all()

    latest_eta_log = (
        await session.execute(
            select(DeliveryEtaLog)
            .where(DeliveryEtaLog.delivery_id == delivery.id)
            .order_by(DeliveryEtaLog.computed_at.desc())
            .limit(1)
        )
    ).scalars().first()

    return {
        "id": delivery.id,
        "delivery_type": delivery.delivery_type,
        "status": delivery.status,
        "total_distance_km": delivery.total_distance_km,
        "total_duration_minutes": delivery.total_duration_minutes,
        "optimized_distance_km": delivery.optimized_distance_km,
        "naive_distance_km": delivery.naive_distance_km,
        "route_geometry": _parse_route_geometry(delivery.route_geometry),
        "created_at": delivery.created_at,
        "stops": stops,
        "latest_eta": latest_eta_log.estimated_arrival if latest_eta_log else None,
    }


async def create_single_delivery(
    session: AsyncSession,
    order_assignment_id: int,
    created_by_user_id: Optional[int] = None,
) -> Dict:
    contexts = await _load_assignment_contexts(session, [order_assignment_id])
    context = contexts[0]

    route = await compute_single_route(
        context.supplier.latitude,
        context.supplier.longitude,
        context.buyer.latitude,
        context.buyer.longitude,
    )

    now = datetime.now(timezone.utc)
    pickup_eta = now + timedelta(hours=_lead_hours(context))
    dropoff_eta = pickup_eta + timedelta(minutes=float(route["duration_minutes"]))
    required_end = _required_delivery(context.order)

    delivery = Delivery(
        delivery_type="single",
        status="PLANNED",
        total_distance_km=float(route["distance_km"]),
        total_duration_minutes=float(route["duration_minutes"]),
        optimized_distance_km=float(route["distance_km"]),
        naive_distance_km=float(route["distance_km"]),
        route_geometry=json.dumps(route["geometry"]),
    )
    session.add(delivery)
    await session.flush()

    session.add_all(
        [
            DeliveryStop(
                delivery_id=delivery.id,
                order_assignment_id=context.assignment.id,
                stop_type="pickup",
                sequence_order=1,
                latitude=context.supplier.latitude,
                longitude=context.supplier.longitude,
                time_window_start=now,
                time_window_end=required_end,
                eta=pickup_eta,
            ),
            DeliveryStop(
                delivery_id=delivery.id,
                order_assignment_id=context.assignment.id,
                stop_type="dropoff",
                sequence_order=2,
                latitude=context.buyer.latitude,
                longitude=context.buyer.longitude,
                time_window_start=now,
                time_window_end=required_end,
                eta=dropoff_eta,
            ),
        ]
    )

    session.add(DeliveryEtaLog(delivery_id=delivery.id, estimated_arrival=dropoff_eta))
    await session.commit()

    await emit_event(
        "DELIVERY_PLANNED",
        {
            "entity_type": "delivery",
            "entity_id": delivery.id,
            "delivery_id": delivery.id,
            "delivery_type": "single",
            "order_assignment_ids": [context.assignment.id],
            "created_by": created_by_user_id,
        },
        _context_event_targets(contexts),
    )

    refreshed = await session.get(Delivery, delivery.id)
    return await _build_delivery_response(session, refreshed)

async def create_batched_delivery(
    session: AsyncSession,
    order_assignment_ids: Sequence[int],
    num_vehicles: int = 3,
    created_by_user_id: Optional[int] = None,
) -> List[Dict]:
    contexts = await _load_assignment_contexts(session, order_assignment_ids)
    if len(contexts) < 2:
        raise ValueError("Batch delivery requires at least two assignments")

    all_points: List[Tuple[float, float]] = []
    for context in contexts:
        all_points.append((context.supplier.latitude, context.supplier.longitude))
        all_points.append((context.buyer.latitude, context.buyer.longitude))

    depot = _centroid(all_points)
    now = datetime.now(timezone.utc)

    locations: List[Tuple[float, float]] = [depot]
    time_windows: List[Tuple[int, int]] = [(0, 24 * 60 * 60)]
    pickups_deliveries: List[Tuple[int, int]] = []
    node_meta: Dict[int, Dict] = {}
    context_by_assignment_id = {context.assignment.id: context for context in contexts}

    for context in contexts:
        pickup_index = len(locations)
        locations.append((context.supplier.latitude, context.supplier.longitude))

        dropoff_index = len(locations)
        locations.append((context.buyer.latitude, context.buyer.longitude))

        pickups_deliveries.append((pickup_index, dropoff_index))

        required_end = _required_delivery(context.order)
        seconds_until_due = max(3600, int((_as_utc(required_end) - now).total_seconds()))
        lead_seconds = int(_lead_hours(context) * 3600)
        pickup_deadline = max(1800, seconds_until_due - lead_seconds)

        time_windows.append((0, pickup_deadline))
        time_windows.append((0, seconds_until_due))

        node_meta[pickup_index] = {
            "assignment_id": context.assignment.id,
            "stop_type": "pickup",
            "lat": context.supplier.latitude,
            "lng": context.supplier.longitude,
        }
        node_meta[dropoff_index] = {
            "assignment_id": context.assignment.id,
            "stop_type": "dropoff",
            "lat": context.buyer.latitude,
            "lng": context.buyer.longitude,
        }

    distance_matrix = await compute_distance_matrix(locations)
    vehicle_count = max(1, min(num_vehicles, len(contexts)))
    routes = solve_vrp(distance_matrix, pickups_deliveries, time_windows, num_vehicles=vehicle_count)

    created_deliveries: List[Delivery] = []
    naive_distance_cache: Dict[int, float] = {}

    for route_nodes in routes:
        executable_nodes = [node for node in route_nodes if node != 0]
        if len(executable_nodes) < 2:
            continue

        route_points = [locations[node] for node in executable_nodes]
        chained_route = await _chain_route_points(route_points)

        delivery = Delivery(
            delivery_type="batched",
            status="PLANNED",
            total_distance_km=float(chained_route["distance_km"]),
            total_duration_minutes=float(chained_route["duration_minutes"]),
            optimized_distance_km=float(chained_route["distance_km"]),
            naive_distance_km=0.0,
            route_geometry=json.dumps(chained_route["geometry"]),
        )
        session.add(delivery)
        await session.flush()

        current_time = now
        sequence = 1
        dropoff_etas: List[datetime] = []
        assignment_ids_in_route: List[int] = []

        for idx in range(1, len(executable_nodes)):
            hop_duration = float(chained_route["segment_durations"][idx - 1])
            current_time = current_time + timedelta(minutes=hop_duration)
            node = executable_nodes[idx]

            meta = node_meta[node]
            context = context_by_assignment_id[meta["assignment_id"]]
            stop_type = meta["stop_type"]

            if stop_type == "pickup":
                ready_time = now + timedelta(hours=_lead_hours(context))
                if current_time < ready_time:
                    current_time = ready_time

            stop = DeliveryStop(
                delivery_id=delivery.id,
                order_assignment_id=context.assignment.id,
                stop_type=stop_type,
                sequence_order=sequence,
                latitude=meta["lat"],
                longitude=meta["lng"],
                time_window_start=now,
                time_window_end=_required_delivery(context.order),
                eta=current_time,
            )
            session.add(stop)
            sequence += 1
            assignment_ids_in_route.append(context.assignment.id)

            if stop_type == "dropoff":
                dropoff_etas.append(current_time)

        naive_distance = 0.0
        for assignment_id in sorted(set(assignment_ids_in_route)):
            if assignment_id not in naive_distance_cache:
                context = context_by_assignment_id[assignment_id]
                direct_route = await compute_single_route(
                    context.supplier.latitude,
                    context.supplier.longitude,
                    context.buyer.latitude,
                    context.buyer.longitude,
                )
                naive_distance_cache[assignment_id] = float(direct_route["distance_km"])
            naive_distance += naive_distance_cache[assignment_id]

        delivery.naive_distance_km = naive_distance
        session.add(DeliveryEtaLog(
            delivery_id=delivery.id,
            estimated_arrival=max(dropoff_etas) if dropoff_etas else current_time,
        ))

        created_deliveries.append(delivery)

    if not created_deliveries:
        raise ValueError("No delivery routes generated by VRP solver")

    await session.commit()

    target_user_ids = _context_event_targets(contexts)
    for delivery in created_deliveries:
        await emit_event(
            "DELIVERY_PLANNED",
            {
                "entity_type": "delivery",
                "entity_id": delivery.id,
                "delivery_id": delivery.id,
                "delivery_type": "batched",
                "created_by": created_by_user_id,
            },
            target_user_ids,
        )

    responses: List[Dict] = []
    for delivery in created_deliveries:
        refreshed = await session.get(Delivery, delivery.id)
        responses.append(await _build_delivery_response(session, refreshed))
    return responses


async def _target_users_for_delivery(session: AsyncSession, delivery_id: int) -> List[int]:
    assignment_ids = [
        value
        for value in (
            await session.execute(
                select(DeliveryStop.order_assignment_id)
                .where(
                    DeliveryStop.delivery_id == delivery_id,
                    DeliveryStop.order_assignment_id.is_not(None),
                )
            )
        ).scalars().all()
        if value is not None
    ]
    if not assignment_ids:
        return []

    contexts = await _load_assignment_contexts(session, assignment_ids)
    return _context_event_targets(contexts)


async def list_deliveries_for_user(session: AsyncSession, user: Dict) -> List[Dict]:
    role = user.get("role")
    user_id = int(user.get("sub") or 0)

    if role == "admin":
        deliveries = (
            await session.execute(select(Delivery).order_by(Delivery.created_at.desc()))
        ).scalars().all()
    elif role == "supplier":
        stmt = (
            select(Delivery)
            .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
            .join(OrderAssignment, OrderAssignment.id == DeliveryStop.order_assignment_id)
            .join(SupplierProfile, SupplierProfile.id == OrderAssignment.supplier_id)
            .where(SupplierProfile.user_id == user_id)
            .distinct()
            .order_by(Delivery.created_at.desc())
        )
        deliveries = (await session.execute(stmt)).scalars().all()
    elif role == "buyer":
        stmt = (
            select(Delivery)
            .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
            .join(OrderAssignment, OrderAssignment.id == DeliveryStop.order_assignment_id)
            .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .join(BuyerProfile, BuyerProfile.id == Order.buyer_id)
            .where(BuyerProfile.user_id == user_id)
            .distinct()
            .order_by(Delivery.created_at.desc())
        )
        deliveries = (await session.execute(stmt)).scalars().all()
    else:
        deliveries = []

    responses: List[Dict] = []
    for delivery in deliveries:
        responses.append(await _build_delivery_response(session, delivery))
    return responses


async def get_available_confirmed_assignments(session: AsyncSession) -> List[Dict]:
    assigned_subquery = (
        select(DeliveryStop.order_assignment_id)
        .where(DeliveryStop.order_assignment_id.is_not(None))
        .distinct()
    )

    stmt = (
        select(OrderAssignment, OrderItem, Order, SupplierProfile, BuyerProfile)
        .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
        .join(Order, Order.id == OrderItem.order_id)
        .join(SupplierProfile, SupplierProfile.id == OrderAssignment.supplier_id)
        .join(BuyerProfile, BuyerProfile.id == Order.buyer_id)
        .where(
            Order.status == "CONFIRMED",
            OrderAssignment.status.in_(["ACCEPTED", "PROPOSED"]),
            OrderAssignment.id.not_in(assigned_subquery),
        )
        .order_by(Order.required_delivery_date.asc())
    )

    rows = (await session.execute(stmt)).all()
    results: List[Dict] = []
    for assignment, order_item, order, supplier, buyer in rows:
        results.append(
            {
                "id": assignment.id,
                "order_id": order.id,
                "order_item_id": order_item.id,
                "part_number": order_item.part_number,
                "quantity": order_item.quantity,
                "supplier_id": supplier.id,
                "supplier_name": supplier.business_name,
                "buyer_factory_name": buyer.factory_name,
                "required_delivery_date": order.required_delivery_date,
            }
        )
    return results

async def get_delivery_for_user(session: AsyncSession, delivery_id: int, user: Dict) -> Dict:
    delivery = await session.get(Delivery, delivery_id)
    if delivery is None:
        raise ValueError("Delivery not found")

    role = user.get("role")
    if role == "admin":
        return await _build_delivery_response(session, delivery)

    allowed = False
    user_id = int(user.get("sub") or 0)

    if role == "supplier":
        supplier_access = await session.execute(
            select(Delivery.id)
            .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
            .join(OrderAssignment, OrderAssignment.id == DeliveryStop.order_assignment_id)
            .join(SupplierProfile, SupplierProfile.id == OrderAssignment.supplier_id)
            .where(Delivery.id == delivery_id, SupplierProfile.user_id == user_id)
            .limit(1)
        )
        allowed = supplier_access.scalar_one_or_none() is not None
    elif role == "buyer":
        buyer_access = await session.execute(
            select(Delivery.id)
            .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
            .join(OrderAssignment, OrderAssignment.id == DeliveryStop.order_assignment_id)
            .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .join(BuyerProfile, BuyerProfile.id == Order.buyer_id)
            .where(Delivery.id == delivery_id, BuyerProfile.user_id == user_id)
            .limit(1)
        )
        allowed = buyer_access.scalar_one_or_none() is not None

    if not allowed:
        raise PermissionError("Not authorized to view this delivery")

    return await _build_delivery_response(session, delivery)


async def get_delivery_route_geometry(session: AsyncSession, delivery_id: int, user: Dict) -> Dict:
    delivery_response = await get_delivery_for_user(session, delivery_id, user)
    return delivery_response.get("route_geometry") or {"type": "LineString", "coordinates": []}


async def update_delivery_status(
    session: AsyncSession,
    delivery_id: int,
    status: str,
    changed_by_user_id: Optional[int] = None,
) -> Dict:
    delivery = await session.get(Delivery, delivery_id)
    if delivery is None:
        raise ValueError("Delivery not found")

    current = delivery.status
    valid_transitions = {
        "PLANNED": "IN_PROGRESS",
        "IN_PROGRESS": "COMPLETED",
        "COMPLETED": "COMPLETED",
    }
    expected_next = valid_transitions.get(current)
    if status != current and status != expected_next:
        raise ValueError(f"Invalid status transition from {current} to {status}")

    delivery.status = status

    if status == "COMPLETED":
        assignment_ids = [
            assignment_id
            for assignment_id in (
                await session.execute(
                    select(DeliveryStop.order_assignment_id).where(DeliveryStop.delivery_id == delivery_id)
                )
            ).scalars().all()
            if assignment_id is not None
        ]
        if assignment_ids:
            await session.execute(
                update(OrderAssignment)
                .where(OrderAssignment.id.in_(assignment_ids), OrderAssignment.status != "REJECTED")
                .values(status="FULFILLED")
            )

    await session.commit()

    if status == "COMPLETED":
        await emit_event(
            "DELIVERY_COMPLETED",
            {
                "entity_type": "delivery",
                "entity_id": delivery.id,
                "delivery_id": delivery.id,
                "status": status,
                "changed_by": changed_by_user_id,
            },
            await _target_users_for_delivery(session, delivery.id),
        )

    refreshed = await session.get(Delivery, delivery.id)
    return await _build_delivery_response(session, refreshed)


async def update_eta(
    session: AsyncSession,
    delivery_id: int,
    changed_by_user_id: Optional[int] = None,
) -> Dict:
    delivery = await session.get(Delivery, delivery_id)
    if delivery is None:
        raise ValueError("Delivery not found")

    ordered_stops = (
        await session.execute(
            select(DeliveryStop)
            .where(DeliveryStop.delivery_id == delivery_id)
            .order_by(DeliveryStop.sequence_order)
        )
    ).scalars().all()

    if not ordered_stops:
        raise ValueError("Delivery has no stops")

    now = datetime.now(timezone.utc)
    pending_stops = [stop for stop in ordered_stops if stop.eta is None or _as_utc(stop.eta) >= now]
    if not pending_stops:
        pending_stops = [ordered_stops[-1]]

    pending_stops[0].eta = now
    current_time = now

    for idx in range(1, len(pending_stops)):
        previous_stop = pending_stops[idx - 1]
        stop = pending_stops[idx]
        segment = await compute_single_route(
            previous_stop.latitude,
            previous_stop.longitude,
            stop.latitude,
            stop.longitude,
        )
        current_time = current_time + timedelta(minutes=float(segment["duration_minutes"]))
        stop.eta = current_time

    estimated_arrival = pending_stops[-1].eta
    session.add(DeliveryEtaLog(delivery_id=delivery_id, estimated_arrival=estimated_arrival))
    await session.commit()

    await emit_event(
        "ETA_UPDATED",
        {
            "entity_type": "delivery",
            "entity_id": delivery.id,
            "delivery_id": delivery.id,
            "estimated_arrival": estimated_arrival.isoformat() if estimated_arrival else None,
            "changed_by": changed_by_user_id,
        },
        await _target_users_for_delivery(session, delivery.id),
    )

    refreshed = await session.get(Delivery, delivery.id)
    return await _build_delivery_response(session, refreshed)


async def get_delivery_stats(session: AsyncSession) -> Dict:
    avg_values = (
        await session.execute(
            select(
                func.avg(Delivery.total_distance_km),
                func.avg(Delivery.total_duration_minutes),
            )
        )
    ).first()

    savings_values = (
        await session.execute(
            select(
                func.sum(func.coalesce(Delivery.naive_distance_km, 0.0) - func.coalesce(Delivery.optimized_distance_km, 0.0)),
                func.sum(func.coalesce(Delivery.naive_distance_km, 0.0)),
                func.sum(func.coalesce(Delivery.optimized_distance_km, 0.0)),
            ).where(Delivery.delivery_type == "batched")
        )
    ).first()

    avg_distance = float(avg_values[0] or 0.0)
    avg_duration = float(avg_values[1] or 0.0)

    total_savings = max(0.0, float(savings_values[0] or 0.0))
    total_naive = float(savings_values[1] or 0.0)
    total_optimized = float(savings_values[2] or 0.0)

    return {
        "avg_distance_km": avg_distance,
        "avg_duration_minutes": avg_duration,
        "total_savings_km": total_savings,
        "total_savings_percent": _savings_percent(total_naive, total_optimized),
    }


def compute_optimization_result(delivery_response: Dict) -> Dict:
    optimized = float(delivery_response.get("optimized_distance_km") or 0.0)
    naive = float(delivery_response.get("naive_distance_km") or 0.0)
    savings = _savings_percent(naive, optimized)

    ordered_stops = []
    for stop in delivery_response.get("stops", []):
        ordered_stops.append(
            {
                "index": stop.sequence_order if hasattr(stop, "sequence_order") else stop.get("sequence_order"),
                "latitude": stop.latitude if hasattr(stop, "latitude") else stop.get("latitude"),
                "longitude": stop.longitude if hasattr(stop, "longitude") else stop.get("longitude"),
                "stop_type": stop.stop_type if hasattr(stop, "stop_type") else stop.get("stop_type"),
                "order_assignment_id": stop.order_assignment_id if hasattr(stop, "order_assignment_id") else stop.get("order_assignment_id"),
            }
        )

    return {
        "optimized_distance": optimized,
        "naive_distance": naive,
        "savings_percent": savings,
        "route_geometry": delivery_response.get("route_geometry") or {"type": "LineString", "coordinates": []},
        "ordered_stops": ordered_stops,
    }
