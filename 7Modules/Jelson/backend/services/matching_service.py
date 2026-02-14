import math
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.events.bus import emit_event
from backend.models.catalog import PartsCatalog
from backend.models.matching import MatchingLog
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.user import BuyerProfile, SupplierProfile


def normalize_part_number(part_number: str) -> str:
    return "".join(ch for ch in part_number.upper() if ch.isalnum())


def haversine_distance_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius_km = 6371.0
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    dlat = lat2_rad - lat1_rad
    dlon = lon2_rad - lon1_rad
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


def _urgency_score(urgency: str, lead_time_hours: int) -> float:
    if urgency == "critical":
        return max(0.0, 1.0 - (lead_time_hours / 24))
    if urgency == "urgent":
        return max(0.0, 1.0 - (lead_time_hours / 72))
    return max(0.0, 1.0 - (lead_time_hours / 168))


async def _match_full_order_internal(order_id: int, db: AsyncSession) -> dict[str, int]:
    order_result = await db.execute(select(Order).where(Order.id == order_id))
    order = order_result.scalar_one_or_none()
    if order is None:
        raise ValueError("Order not found")

    buyer_profile_result = await db.execute(select(BuyerProfile).where(BuyerProfile.id == order.buyer_id))
    buyer_profile = buyer_profile_result.scalar_one_or_none()
    if buyer_profile is None:
        raise ValueError("Buyer profile not found")

    items_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    order_items = items_result.scalars().all()

    matched_items = 0
    assignments_created = 0
    logs_written = 0
    post_commit_events: list[dict[str, Any]] = []

    for item in order_items:
        if item.status == "CANCELLED":
            continue

        normalized = normalize_part_number(item.part_number)
        candidate_result = await db.execute(
            select(PartsCatalog, SupplierProfile)
            .join(SupplierProfile, PartsCatalog.supplier_id == SupplierProfile.id)
            .where(
                PartsCatalog.normalized_part_number == normalized,
                PartsCatalog.quantity_in_stock >= item.quantity,
            )
        )
        candidates = candidate_result.all()
        if not candidates:
            continue

        price_values = [float(catalog.unit_price) for catalog, _ in candidates]
        min_price = min(price_values)
        max_price = max(price_values)
        price_range = max(max_price - min_price, 0.0001)

        scored_candidates: list[tuple[float, PartsCatalog, SupplierProfile, float, float, float, float]] = []
        for catalog, supplier in candidates:
            distance_km = haversine_distance_km(
                float(buyer_profile.latitude),
                float(buyer_profile.longitude),
                float(supplier.latitude),
                float(supplier.longitude),
            )
            max_radius = float(supplier.service_radius_km or 100)
            distance_score = max(0.0, 1.0 - (distance_km / max(max_radius, 1.0)))
            reliability_score = max(0.0, min(1.0, float(supplier.reliability_score or 0.5)))
            price_score = (max_price - float(catalog.unit_price)) / price_range
            urgency_score = _urgency_score(order.urgency, int(catalog.lead_time_hours))
            total_score = (
                (0.35 * distance_score)
                + (0.25 * reliability_score)
                + (0.25 * price_score)
                + (0.15 * urgency_score)
            )

            scored_candidates.append(
                (total_score, catalog, supplier, distance_km, distance_score, reliability_score, price_score)
            )

        scored_candidates.sort(key=lambda entry: entry[0], reverse=True)

        for rank, entry in enumerate(scored_candidates, start=1):
            total_score, catalog, supplier, distance_km, distance_score, reliability_score, price_score = entry
            urgency_score = _urgency_score(order.urgency, int(catalog.lead_time_hours))
            db.add(
                MatchingLog(
                    order_item_id=item.id,
                    supplier_id=supplier.id,
                    distance_km=distance_km,
                    distance_score=distance_score,
                    reliability_score=reliability_score,
                    price_score=price_score,
                    urgency_score=urgency_score,
                    total_score=total_score,
                    rank=rank,
                )
            )
            logs_written += 1

        best_total, best_catalog, best_supplier, *_ = scored_candidates[0]
        existing_assignment_result = await db.execute(
            select(OrderAssignment).where(OrderAssignment.order_item_id == item.id)
        )
        existing_assignment = existing_assignment_result.scalar_one_or_none()
        if existing_assignment is None:
            assignment = OrderAssignment(
                order_item_id=item.id,
                supplier_id=best_supplier.id,
                catalog_id=best_catalog.id,
                assigned_price=float(best_catalog.unit_price) * int(item.quantity),
                match_score=best_total,
                status="PROPOSED",
            )
            db.add(assignment)
            await db.flush()
            assignments_created += 1
        else:
            existing_assignment.supplier_id = best_supplier.id
            existing_assignment.catalog_id = best_catalog.id
            existing_assignment.assigned_price = float(best_catalog.unit_price) * int(item.quantity)
            existing_assignment.match_score = best_total
            existing_assignment.status = "PROPOSED"
            assignment = existing_assignment

        item.status = "MATCHED"
        order.status = "MATCHED"
        matched_items += 1

        post_commit_events.append(
            {
                "event_type": "SUPPLIER_MATCHED",
                "payload": {
                    "order_id": order.id,
                    "order_item_id": item.id,
                    "order_assignment_id": assignment.id,
                    "entity_type": "order",
                    "entity_id": order.id,
                    "buyer_id": order.buyer_id,
                    "buyer_user_id": buyer_profile.user_id,
                    "supplier_id": best_supplier.id,
                    "supplier_user_id": best_supplier.user_id,
                    "supplier_name": best_supplier.business_name,
                },
                "target_user_ids": [buyer_profile.user_id, best_supplier.user_id],
            }
        )

    await db.commit()

    for event in post_commit_events:
        await emit_event(
            event["event_type"],
            event["payload"],
            event["target_user_ids"],
        )

    return {
        "order_id": order_id,
        "matched_items": matched_items,
        "assignments_created": assignments_created,
        "logs_written": logs_written,
    }


async def match_full_order(order_id: int, db: AsyncSession | None = None) -> dict[str, int]:
    if db is not None:
        return await _match_full_order_internal(order_id, db)

    async with AsyncSessionLocal() as session:
        return await _match_full_order_internal(order_id, session)
