import asyncio
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import AsyncSessionLocal
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.user import BuyerProfile, SupplierProfile, User


@dataclass
class EventHandlingResult:
    title: str
    message: str
    metadata: dict[str, Any]
    target_user_ids: list[int]


def _safe_int(value: Any) -> int | None:
    try:
        return int(value) if value is not None else None
    except (TypeError, ValueError):
        return None


async def _get_admin_user_ids(session: AsyncSession) -> list[int]:
    result = await session.execute(select(User.id).where(User.role == "admin", User.is_active.is_(True)))
    return [row[0] for row in result.all()]


async def _get_buyer_user_id(
    session: AsyncSession,
    metadata: dict[str, Any],
    order_id: int | None,
) -> int | None:
    direct = _safe_int(metadata.get("buyer_user_id"))
    if direct is not None:
        return direct

    buyer_profile_id = _safe_int(metadata.get("buyer_id"))
    if buyer_profile_id is not None:
        result = await session.execute(select(BuyerProfile.user_id).where(BuyerProfile.id == buyer_profile_id))
        row = result.first()
        if row:
            return _safe_int(row[0])

    if order_id is not None:
        result = await session.execute(
            select(BuyerProfile.user_id)
            .join(Order, Order.buyer_id == BuyerProfile.id)
            .where(Order.id == order_id)
        )
        row = result.first()
        if row:
            return _safe_int(row[0])

    return None


async def _get_supplier_user_id(
    session: AsyncSession,
    metadata: dict[str, Any],
) -> int | None:
    direct = _safe_int(metadata.get("supplier_user_id"))
    if direct is not None:
        return direct

    supplier_profile_id = _safe_int(metadata.get("supplier_id")) or _safe_int(metadata.get("matched_supplier_id"))
    if supplier_profile_id is not None:
        result = await session.execute(select(SupplierProfile.user_id).where(SupplierProfile.id == supplier_profile_id))
        row = result.first()
        if row:
            return _safe_int(row[0])

    assignment_id = _safe_int(metadata.get("order_assignment_id"))
    if assignment_id is not None:
        result = await session.execute(
            select(SupplierProfile.user_id)
            .join(OrderAssignment, OrderAssignment.supplier_id == SupplierProfile.id)
            .where(OrderAssignment.id == assignment_id)
        )
        row = result.first()
        if row:
            return _safe_int(row[0])

    return None


def _human_event_title(event_type: str) -> str:
    return event_type.replace("_", " ").title()


async def _trigger_matching_for_order(order_id: int):
    from backend.services.matching_service import match_full_order

    await match_full_order(order_id)


async def _trigger_matching_safely(order_id: int):
    try:
        await _trigger_matching_for_order(order_id)
    except Exception:
        # Matching service failures should not block event emission.
        return


async def _trigger_routing_for_order_confirmation(metadata: dict[str, Any]):
    from backend.services.routing_service import create_single_delivery

    assignment_id = _safe_int(metadata.get("order_assignment_id"))
    if assignment_id is not None:
        await create_single_delivery(assignment_id)
        return

    order_id = _safe_int(metadata.get("order_id")) or _safe_int(metadata.get("entity_id"))
    if order_id is None:
        return

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(OrderAssignment.id)
            .join(OrderItem, OrderAssignment.order_item_id == OrderItem.id)
            .where(OrderItem.order_id == order_id, OrderAssignment.status == "ACCEPTED")
        )
        assignment_ids = [int(row[0]) for row in result.all()]

    for found_assignment_id in assignment_ids:
        await create_single_delivery(found_assignment_id)


async def _trigger_routing_safely(metadata: dict[str, Any]):
    try:
        await _trigger_routing_for_order_confirmation(metadata)
    except Exception:
        # Routing failures should not block notifications.
        return


async def _update_supplier_reliability(session: AsyncSession, metadata: dict[str, Any]):
    supplier_id = _safe_int(metadata.get("supplier_id")) or _safe_int(metadata.get("matched_supplier_id"))

    if supplier_id is None:
        assignment_id = _safe_int(metadata.get("order_assignment_id"))
        if assignment_id is not None:
            result = await session.execute(
                select(OrderAssignment.supplier_id).where(OrderAssignment.id == assignment_id)
            )
            row = result.first()
            supplier_id = _safe_int(row[0]) if row else None

    if supplier_id is None:
        return

    result = await session.execute(select(SupplierProfile).where(SupplierProfile.id == supplier_id))
    supplier = result.scalar_one_or_none()
    if supplier is None:
        return

    baseline = float(supplier.reliability_score or 0.5)
    supplier.reliability_score = min(1.0, max(0.0, baseline + 0.02))


async def prepare_event(
    session: AsyncSession,
    event_type: str,
    payload: dict[str, Any],
    target_user_ids: list[int],
) -> EventHandlingResult:
    metadata = dict(payload or {})
    deduped_targets: set[int] = set()
    for user_id in target_user_ids:
        parsed_id = _safe_int(user_id)
        if parsed_id is not None:
            deduped_targets.add(parsed_id)

    order_id = _safe_int(metadata.get("order_id")) or _safe_int(metadata.get("entity_id"))
    part_name = str(metadata.get("part_name") or metadata.get("part_number") or "Part")
    supplier_name = str(metadata.get("supplier_name") or metadata.get("business_name") or "Supplier")
    order_item_id = _safe_int(metadata.get("order_item_id"))
    delivered_order_id = order_id or _safe_int(metadata.get("id"))

    if event_type == "ORDER_PLACED":
        admin_ids = await _get_admin_user_ids(session)
        deduped_targets.update(admin_ids)

        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)

        factory_name = str(metadata.get("factory_name") or metadata.get("buyer_name") or "Factory")
        part_count = metadata.get("parts_count") or metadata.get("item_count") or metadata.get("part_count") or "multiple"
        title = f"New Order #{order_id}" if order_id is not None else "New Order"
        message = f"{factory_name} placed an order for {part_count} parts"

        if order_id is not None:
            asyncio.create_task(_trigger_matching_safely(order_id))

        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "SUPPLIER_MATCHED":
        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        supplier_user_id = await _get_supplier_user_id(session, metadata)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)
        if supplier_user_id is not None:
            deduped_targets.add(supplier_user_id)

        title = "Supplier Matched"
        message = f"{supplier_name} has been matched to your order"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "ORDER_CONFIRMED":
        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)

        title = "Order Confirmed"
        if order_item_id is not None:
            message = f"{supplier_name} confirmed order item {order_item_id}"
        else:
            message = f"{supplier_name} confirmed your order"

        asyncio.create_task(_trigger_routing_safely(metadata))
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "ORDER_DISPATCHED":
        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)

        title = "Order Dispatched"
        message = "Your order is on its way"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "ORDER_IN_TRANSIT":
        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)

        title = "Order In Transit"
        message = "Your order is currently in transit"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "ORDER_DELIVERED":
        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)

        await _update_supplier_reliability(session, metadata)

        delivered_label = delivered_order_id if delivered_order_id is not None else "N/A"
        title = "Order Delivered"
        message = f"Order #{delivered_label} delivered successfully"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "LOW_STOCK_ALERT":
        admin_ids = await _get_admin_user_ids(session)
        deduped_targets.update(admin_ids)

        supplier_user_id = await _get_supplier_user_id(session, metadata)
        if supplier_user_id is not None:
            deduped_targets.add(supplier_user_id)

        remaining = metadata.get("quantity_remaining") or metadata.get("remaining") or metadata.get("quantity")
        remaining_label = remaining if remaining is not None else "low"
        title = "Low Stock Alert"
        message = f"{part_name} is below threshold ({remaining_label} remaining)"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "ORDER_CANCELLED":
        admin_ids = await _get_admin_user_ids(session)
        deduped_targets.update(admin_ids)

        supplier_user_id = await _get_supplier_user_id(session, metadata)
        if supplier_user_id is not None:
            deduped_targets.add(supplier_user_id)

        title = "Order Cancelled"
        if order_id is not None:
            message = f"Order #{order_id} has been cancelled"
        else:
            message = "An order has been cancelled"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "ETA_UPDATED":
        buyer_user_id = await _get_buyer_user_id(session, metadata, order_id)
        if buyer_user_id is not None:
            deduped_targets.add(buyer_user_id)

        eta = metadata.get("eta") or metadata.get("estimated_arrival")
        eta_label = str(eta) if eta is not None else "updated"
        title = "ETA Updated"
        message = f"Updated ETA: {eta_label}"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "DELIVERY_PLANNED":
        admin_ids = await _get_admin_user_ids(session)
        deduped_targets.update(admin_ids)
        title = "Delivery Planned"
        message = "A delivery route has been planned"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    if event_type == "DELIVERY_COMPLETED":
        admin_ids = await _get_admin_user_ids(session)
        deduped_targets.update(admin_ids)
        title = "Delivery Completed"
        message = "A delivery route has been completed"
        return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))

    title = str(metadata.get("title") or _human_event_title(event_type))
    message = str(metadata.get("message") or f"{title} triggered")
    return EventHandlingResult(title=title, message=message, metadata=metadata, target_user_ids=sorted(deduped_targets))
