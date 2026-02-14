import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.events.bus import emit_event
from backend.models.delivery import Delivery, DeliveryEtaLog, DeliveryStop
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.user import BuyerProfile, SupplierProfile
from backend.services.matching_service import haversine_distance_km


def _build_linestring_geojson(
    start_lat: float,
    start_lon: float,
    end_lat: float,
    end_lon: float,
) -> str:
    geometry = {
        "type": "LineString",
        "coordinates": [
            [start_lon, start_lat],
            [end_lon, end_lat],
        ],
    }
    return json.dumps(geometry)


async def _create_single_delivery_internal(order_assignment_id: int, db: AsyncSession) -> Delivery:
    assignment_result = await db.execute(
        select(OrderAssignment, OrderItem, Order, SupplierProfile, BuyerProfile)
        .join(OrderItem, OrderAssignment.order_item_id == OrderItem.id)
        .join(Order, OrderItem.order_id == Order.id)
        .join(SupplierProfile, OrderAssignment.supplier_id == SupplierProfile.id)
        .join(BuyerProfile, Order.buyer_id == BuyerProfile.id)
        .where(OrderAssignment.id == order_assignment_id)
    )
    row = assignment_result.first()
    if row is None:
        raise ValueError("Order assignment not found")

    assignment, order_item, order, supplier, buyer = row
    distance_km = haversine_distance_km(
        float(supplier.latitude),
        float(supplier.longitude),
        float(buyer.latitude),
        float(buyer.longitude),
    )
    duration_minutes = max(10.0, (distance_km / 35.0) * 60.0)

    delivery = Delivery(
        delivery_type="single",
        status="PLANNED",
        total_distance_km=distance_km,
        total_duration_minutes=duration_minutes,
        optimized_distance_km=distance_km,
        naive_distance_km=distance_km,
        route_geometry=_build_linestring_geojson(
            float(supplier.latitude),
            float(supplier.longitude),
            float(buyer.latitude),
            float(buyer.longitude),
        ),
    )
    db.add(delivery)
    await db.flush()

    now_utc = datetime.now(timezone.utc)
    eta_time = now_utc + timedelta(minutes=duration_minutes)

    db.add(
        DeliveryStop(
            delivery_id=delivery.id,
            order_assignment_id=assignment.id,
            stop_type="pickup",
            sequence_order=1,
            latitude=float(supplier.latitude),
            longitude=float(supplier.longitude),
            eta=now_utc.replace(tzinfo=None),
        )
    )
    db.add(
        DeliveryStop(
            delivery_id=delivery.id,
            order_assignment_id=assignment.id,
            stop_type="dropoff",
            sequence_order=2,
            latitude=float(buyer.latitude),
            longitude=float(buyer.longitude),
            eta=eta_time.replace(tzinfo=None),
        )
    )
    db.add(
        DeliveryEtaLog(
            delivery_id=delivery.id,
            estimated_arrival=eta_time.replace(tzinfo=None),
        )
    )
    await db.commit()
    await db.refresh(delivery)

    await emit_event(
        "DELIVERY_PLANNED",
        {
            "delivery_id": delivery.id,
            "order_id": order.id,
            "order_item_id": order_item.id,
            "order_assignment_id": assignment.id,
            "buyer_id": buyer.id,
            "buyer_user_id": buyer.user_id,
            "supplier_id": supplier.id,
            "supplier_user_id": supplier.user_id,
            "entity_type": "delivery",
            "entity_id": delivery.id,
            "message": f"Delivery #{delivery.id} planned for order #{order.id}",
        },
        [buyer.user_id, supplier.user_id],
    )
    return delivery


async def create_single_delivery(order_assignment_id: int, db: AsyncSession | None = None) -> Delivery:
    if db is not None:
        return await _create_single_delivery_internal(order_assignment_id, db)

    async with AsyncSessionLocal() as session:
        return await _create_single_delivery_internal(order_assignment_id, session)


async def create_batched_delivery(assignment_ids: list[int], db: AsyncSession) -> Delivery:
    if not assignment_ids:
        raise ValueError("No assignment IDs provided")

    result = await db.execute(
        select(OrderAssignment, OrderItem, Order, SupplierProfile, BuyerProfile)
        .join(OrderItem, OrderAssignment.order_item_id == OrderItem.id)
        .join(Order, OrderItem.order_id == Order.id)
        .join(SupplierProfile, OrderAssignment.supplier_id == SupplierProfile.id)
        .join(BuyerProfile, Order.buyer_id == BuyerProfile.id)
        .where(OrderAssignment.id.in_(assignment_ids))
    )
    rows = result.all()
    if not rows:
        raise ValueError("No assignments found for batch delivery")

    total_naive = 0.0
    for assignment, order_item, order, supplier, buyer in rows:
        total_naive += haversine_distance_km(
            float(supplier.latitude),
            float(supplier.longitude),
            float(buyer.latitude),
            float(buyer.longitude),
        )
    optimized = max(total_naive * 0.82, total_naive * 0.5)
    duration_minutes = max(20.0, (optimized / 35.0) * 60.0)

    first = rows[0]
    _, _, first_order, first_supplier, first_buyer = first
    delivery = Delivery(
        delivery_type="batched",
        status="PLANNED",
        total_distance_km=optimized,
        total_duration_minutes=duration_minutes,
        optimized_distance_km=optimized,
        naive_distance_km=total_naive,
        route_geometry=_build_linestring_geojson(
            float(first_supplier.latitude),
            float(first_supplier.longitude),
            float(first_buyer.latitude),
            float(first_buyer.longitude),
        ),
    )
    db.add(delivery)
    await db.flush()

    sequence = 1
    now_utc = datetime.now(timezone.utc)
    for assignment, order_item, order, supplier, buyer in rows:
        db.add(
            DeliveryStop(
                delivery_id=delivery.id,
                order_assignment_id=assignment.id,
                stop_type="pickup",
                sequence_order=sequence,
                latitude=float(supplier.latitude),
                longitude=float(supplier.longitude),
                eta=(now_utc + timedelta(minutes=sequence * 10)).replace(tzinfo=None),
            )
        )
        sequence += 1
        db.add(
            DeliveryStop(
                delivery_id=delivery.id,
                order_assignment_id=assignment.id,
                stop_type="dropoff",
                sequence_order=sequence,
                latitude=float(buyer.latitude),
                longitude=float(buyer.longitude),
                eta=(now_utc + timedelta(minutes=sequence * 10)).replace(tzinfo=None),
            )
        )
        sequence += 1

    db.add(
        DeliveryEtaLog(
            delivery_id=delivery.id,
            estimated_arrival=(now_utc + timedelta(minutes=duration_minutes)).replace(tzinfo=None),
        )
    )
    await db.commit()
    await db.refresh(delivery)

    await emit_event(
        "DELIVERY_PLANNED",
        {
            "delivery_id": delivery.id,
            "delivery_type": "batched",
            "assignment_count": len(rows),
            "entity_type": "delivery",
            "entity_id": delivery.id,
            "message": f"Batched delivery #{delivery.id} planned for {len(rows)} assignments",
        },
        [],
    )
    return delivery


async def complete_delivery(delivery: Delivery, db: AsyncSession):
    delivery.status = "COMPLETED"
    await db.commit()
    await db.refresh(delivery)
    await emit_event(
        "DELIVERY_COMPLETED",
        {
            "delivery_id": delivery.id,
            "entity_type": "delivery",
            "entity_id": delivery.id,
            "message": f"Delivery #{delivery.id} completed",
        },
        [],
    )
