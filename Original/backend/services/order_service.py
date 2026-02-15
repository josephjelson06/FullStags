from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.events.bus import emit_event
from backend.models.inventory import InventoryTransaction, PartCategory, PartsCatalog
from backend.models.order import Order, OrderAssignment, OrderItem, OrderStatusHistory
from backend.models.users import BuyerProfile, SupplierProfile
from backend.schemas.order import (
    OrderAssignmentResponse,
    OrderCreate,
    OrderHistoryEntry,
    OrderItemResponse,
    OrderResponse,
)
from backend.services.inventory_service import decrement_stock, haversine_km

ORDER_STATE_MACHINE: Dict[str, List[str]] = {
    "PLACED": ["MATCHED", "CANCELLED"],
    "MATCHED": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["DISPATCHED", "CANCELLED"],
    "DISPATCHED": ["IN_TRANSIT"],
    "IN_TRANSIT": ["DELIVERED"],
    "DELIVERED": [],
    "CANCELLED": [],
}

ITEM_STATE_MACHINE: Dict[str, List[str]] = {
    "PENDING": ["MATCHED", "CANCELLED"],
    "MATCHED": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["DISPATCHED", "CANCELLED"],
    "DISPATCHED": ["IN_TRANSIT"],
    "IN_TRANSIT": ["DELIVERED"],
    "DELIVERED": [],
    "CANCELLED": [],
}

ORDER_STATUS_LEVEL = {
    "PLACED": 0,
    "MATCHED": 1,
    "CONFIRMED": 2,
    "DISPATCHED": 3,
    "IN_TRANSIT": 4,
    "DELIVERED": 5,
}

ORDER_LEVEL_STATUS = [
    "PLACED",
    "MATCHED",
    "CONFIRMED",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
]

ITEM_STATUS_LEVEL = {
    "PENDING": 0,
    "MATCHED": 1,
    "CONFIRMED": 2,
    "DISPATCHED": 3,
    "IN_TRANSIT": 4,
    "DELIVERED": 5,
}

STATUS_EVENT_MAP = {
    "PLACED": "ORDER_PLACED",
    "MATCHED": "SUPPLIER_MATCHED",
    "CONFIRMED": "ORDER_CONFIRMED",
    "DISPATCHED": "ORDER_DISPATCHED",
    "IN_TRANSIT": "ORDER_IN_TRANSIT",
    "DELIVERED": "ORDER_DELIVERED",
    "CANCELLED": "ORDER_CANCELLED",
}

ORDER_TERMINAL_STATES = {"DELIVERED", "CANCELLED"}
EVENT_QUEUE_KEY = "pending_order_events"


def _utc_timestamp() -> str:
    return datetime.now(timezone.utc).replace(tzinfo=None).isoformat(sep=" ", timespec="seconds")


async def _get_supplier_profile_by_user(
    session: AsyncSession, user_id: int
) -> SupplierProfile:
    result = await session.execute(
        select(SupplierProfile).where(SupplierProfile.user_id == user_id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    return supplier


async def _get_order_with_relations(session: AsyncSession, order_id: int) -> Order:
    result = await session.execute(
        select(Order)
        .where(Order.id == order_id)
        .options(
            selectinload(Order.buyer).selectinload(BuyerProfile.user),
            selectinload(Order.items)
            .selectinload(OrderItem.category),
            selectinload(Order.items)
            .selectinload(OrderItem.assignments)
            .selectinload(OrderAssignment.supplier)
            .selectinload(SupplierProfile.user),
            selectinload(Order.history),
        )
    )
    order = result.scalar_one_or_none()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _get_item_with_relations(session: AsyncSession, item_id: int) -> OrderItem:
    result = await session.execute(
        select(OrderItem)
        .where(OrderItem.id == item_id)
        .options(
            selectinload(OrderItem.category),
            selectinload(OrderItem.assignments)
            .selectinload(OrderAssignment.supplier)
            .selectinload(SupplierProfile.user),
            selectinload(OrderItem.order)
            .selectinload(Order.buyer)
            .selectinload(BuyerProfile.user),
            selectinload(OrderItem.order)
            .selectinload(Order.items)
            .selectinload(OrderItem.assignments)
            .selectinload(OrderAssignment.supplier)
            .selectinload(SupplierProfile.user),
        )
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Order item not found")
    return item


async def _get_assignment_with_relations(
    session: AsyncSession, assignment_id: int
) -> OrderAssignment:
    result = await session.execute(
        select(OrderAssignment)
        .where(OrderAssignment.id == assignment_id)
        .options(
            selectinload(OrderAssignment.supplier).selectinload(SupplierProfile.user),
            selectinload(OrderAssignment.order_item)
            .selectinload(OrderItem.order)
            .selectinload(Order.buyer)
            .selectinload(BuyerProfile.user),
            selectinload(OrderAssignment.order_item)
            .selectinload(OrderItem.assignments)
            .selectinload(OrderAssignment.supplier)
            .selectinload(SupplierProfile.user),
        )
    )
    assignment = result.scalar_one_or_none()
    if not assignment:
        raise HTTPException(status_code=404, detail="Order assignment not found")
    return assignment


async def get_assignment_with_details(
    session: AsyncSession, assignment_id: int
) -> OrderAssignment:
    return await _get_assignment_with_relations(session, assignment_id)


async def get_order_with_details(session: AsyncSession, order_id: int) -> Order:
    return await _get_order_with_relations(session, order_id)


def _collect_target_user_ids(order: Order) -> List[int]:
    user_ids: set[int] = set()
    if order.buyer and order.buyer.user_id:
        user_ids.add(order.buyer.user_id)

    for item in order.items:
        for assignment in item.assignments:
            if assignment.supplier and assignment.supplier.user_id:
                user_ids.add(assignment.supplier.user_id)
    return sorted(user_ids)


def _queue_status_event(
    session: AsyncSession,
    order: Order,
    status_value: str,
    payload_extra: Optional[dict] = None,
) -> None:
    event_type = STATUS_EVENT_MAP.get(status_value)
    if not event_type:
        return

    payload = {
        "entity_type": "orders",
        "entity_id": order.id,
        "order_id": order.id,
        "status": status_value,
    }
    if payload_extra:
        payload.update(payload_extra)

    queue: List[Tuple[str, dict, List[int]]] = session.info.setdefault(EVENT_QUEUE_KEY, [])
    queue.append((event_type, payload, _collect_target_user_ids(order)))


async def _flush_queued_events(session: AsyncSession) -> None:
    queue: List[Tuple[str, dict, List[int]]] = session.info.pop(EVENT_QUEUE_KEY, [])
    for event_type, payload, target_user_ids in queue:
        await emit_event(event_type, payload, target_user_ids)


async def _commit_and_flush_events(session: AsyncSession) -> None:
    await session.commit()
    await _flush_queued_events(session)


def _assert_valid_order_transition(current: str, target: str) -> None:
    if target not in ORDER_STATE_MACHINE:
        raise HTTPException(status_code=400, detail=f"Unsupported order status: {target}")
    if target not in ORDER_STATE_MACHINE.get(current, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid order status transition: {current} -> {target}",
        )


def _assert_valid_item_transition(current: str, target: str) -> None:
    if target not in ITEM_STATE_MACHINE:
        raise HTTPException(status_code=400, detail=f"Unsupported item status: {target}")
    if target not in ITEM_STATE_MACHINE.get(current, []):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid item status transition: {current} -> {target}",
        )


def _assignment_owned_by_supplier(item: OrderItem, supplier_id: int) -> bool:
    return any(
        assignment.supplier_id == supplier_id and assignment.status in {"ACCEPTED", "FULFILLED"}
        for assignment in item.assignments
    )


async def _record_order_history(
    session: AsyncSession,
    order_id: int,
    from_status: Optional[str],
    to_status: str,
    changed_by: Optional[int],
    order_item_id: Optional[int] = None,
) -> None:
    session.add(
        OrderStatusHistory(
            order_id=order_id,
            order_item_id=order_item_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
        )
    )


async def _restore_stock(session: AsyncSession, catalog_id: int, quantity: int) -> None:
    catalog = await session.get(PartsCatalog, catalog_id)
    if not catalog:
        return
    catalog.quantity_in_stock += quantity
    catalog.updated_at = _utc_timestamp()
    session.add(
        InventoryTransaction(
            catalog_id=catalog.id,
            change_amount=quantity,
            reason="restock",
        )
    )


async def _auto_advance_order_status(
    session: AsyncSession,
    order: Order,
    changed_by: Optional[int],
) -> None:
    if order.status in ORDER_TERMINAL_STATES:
        return

    active_items = [item for item in order.items if item.status != "CANCELLED"]
    if not active_items:
        from_status = order.status
        order.status = "CANCELLED"
        order.updated_at = _utc_timestamp()
        await _record_order_history(
            session,
            order.id,
            from_status=from_status,
            to_status="CANCELLED",
            changed_by=changed_by,
        )
        _queue_status_event(session, order, "CANCELLED")
        return

    target_level = min(ITEM_STATUS_LEVEL[item.status] for item in active_items)
    target_status = ORDER_LEVEL_STATUS[target_level]

    if target_status == order.status:
        return

    current_level = ORDER_STATUS_LEVEL[order.status]
    if target_level <= current_level:
        return

    for level in range(current_level + 1, target_level + 1):
        next_status = ORDER_LEVEL_STATUS[level]
        from_status = order.status
        _assert_valid_order_transition(from_status, next_status)
        order.status = next_status
        order.updated_at = _utc_timestamp()
        await _record_order_history(
            session,
            order.id,
            from_status=from_status,
            to_status=next_status,
            changed_by=changed_by,
        )
        _queue_status_event(session, order, next_status)


def _validate_urgency(value: str) -> str:
    urgency = value.lower().strip()
    if urgency not in {"standard", "urgent", "critical"}:
        raise HTTPException(status_code=400, detail="Urgency must be standard, urgent, or critical")
    return urgency


async def create_order(
    session: AsyncSession,
    buyer_id: int,
    order_data: OrderCreate,
    changed_by: int,
) -> Order:
    if not order_data.items:
        raise HTTPException(status_code=400, detail="Order must include at least one item")

    buyer = await session.get(BuyerProfile, buyer_id)
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found")

    urgency = _validate_urgency(order_data.urgency)
    required_delivery = (
        order_data.required_delivery_date.isoformat(sep=" ", timespec="seconds")
        if order_data.required_delivery_date
        else None
    )

    order = Order(
        buyer_id=buyer_id,
        status="PLACED",
        urgency=urgency,
        required_delivery_date=required_delivery,
        updated_at=_utc_timestamp(),
    )
    session.add(order)
    await session.flush()

    for item_payload in order_data.items:
        if item_payload.quantity <= 0:
            raise HTTPException(status_code=400, detail="Item quantity must be greater than zero")

        category = await session.get(PartCategory, item_payload.category_id)
        if not category:
            raise HTTPException(status_code=404, detail=f"Category {item_payload.category_id} not found")

        session.add(
            OrderItem(
                order_id=order.id,
                category_id=item_payload.category_id,
                part_number=item_payload.part_number,
                part_description=item_payload.part_description,
                quantity=item_payload.quantity,
                status="PENDING",
            )
        )

    await _record_order_history(
        session,
        order.id,
        from_status=None,
        to_status="PLACED",
        changed_by=changed_by,
    )
    order = await _get_order_with_relations(session, order.id)
    _queue_status_event(session, order, "PLACED")
    await _commit_and_flush_events(session)

    order = await _get_order_with_relations(session, order.id)
    return order


async def assign_supplier_to_item(
    session: AsyncSession,
    order_item_id: int,
    supplier_id: int,
    catalog_id: int,
    price: float,
    score: float,
    changed_by: Optional[int] = None,
) -> OrderAssignment:
    item = await _get_item_with_relations(session, order_item_id)

    if item.status in {"CANCELLED", "DELIVERED"}:
        raise HTTPException(status_code=400, detail="Cannot assign supplier to a closed order item")

    supplier = await session.get(SupplierProfile, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    catalog = await session.get(PartsCatalog, catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog item not found")
    if catalog.supplier_id != supplier_id:
        raise HTTPException(status_code=400, detail="Catalog item does not belong to supplier")

    assignment = OrderAssignment(
        order_item_id=item.id,
        supplier_id=supplier_id,
        catalog_id=catalog_id,
        assigned_price=price,
        match_score=score,
        status="PROPOSED",
    )
    session.add(assignment)
    await session.flush()

    previous_status = item.status
    if item.status == "PENDING":
        item.status = "MATCHED"
        await _record_order_history(
            session,
            order_id=item.order_id,
            order_item_id=item.id,
            from_status=previous_status,
            to_status="MATCHED",
            changed_by=changed_by,
        )
        _queue_status_event(
            session,
            item.order,
            "MATCHED",
            payload_extra={
                "order_item_id": item.id,
                "assignment_id": assignment.id,
                "supplier_id": supplier_id,
            },
        )

    await _auto_advance_order_status(session, item.order, changed_by)
    item.order.updated_at = _utc_timestamp()
    await _commit_and_flush_events(session)
    await session.refresh(assignment)
    return assignment


async def transition_order_status(
    session: AsyncSession,
    order_id: int,
    new_status: str,
    user: Dict,
    *,
    commit: bool = True,
) -> Order:
    order = await _get_order_with_relations(session, order_id)
    target = new_status.strip().upper()

    if target == order.status:
        return order

    _assert_valid_order_transition(order.status, target)

    role = user.get("role")
    user_id = int(user.get("user_id"))

    if role == "admin":
        pass
    elif role == "buyer":
        if not order.buyer or order.buyer.user_id != user_id:
            raise HTTPException(status_code=403, detail="Order does not belong to buyer")
        if target != "CANCELLED":
            raise HTTPException(status_code=403, detail="Buyer can only cancel orders")
        if order.status in {"DISPATCHED", "IN_TRANSIT", "DELIVERED"}:
            raise HTTPException(status_code=400, detail="Order can no longer be cancelled")
    elif role == "supplier":
        supplier = await _get_supplier_profile_by_user(session, user_id)
        if target not in {"DISPATCHED", "IN_TRANSIT", "DELIVERED"}:
            raise HTTPException(status_code=403, detail="Supplier cannot perform this transition")
        has_access = any(
            _assignment_owned_by_supplier(item, supplier.id)
            for item in order.items
        )
        if not has_access:
            raise HTTPException(status_code=403, detail="Supplier has no accepted assignments in this order")
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    previous_status = order.status
    order.status = target
    order.updated_at = _utc_timestamp()

    await _record_order_history(
        session,
        order.id,
        from_status=previous_status,
        to_status=target,
        changed_by=user_id,
    )

    _queue_status_event(session, order, target)

    if commit:
        await _commit_and_flush_events(session)
    else:
        await session.flush()

    return order


async def transition_item_status(
    session: AsyncSession,
    order_item_id: int,
    new_status: str,
    user: Dict,
    *,
    commit: bool = True,
) -> OrderItem:
    item = await _get_item_with_relations(session, order_item_id)
    target = new_status.strip().upper()

    if target == item.status:
        return item

    _assert_valid_item_transition(item.status, target)

    role = user.get("role")
    user_id = int(user.get("user_id"))

    if role == "admin":
        pass
    elif role == "buyer":
        if not item.order.buyer or item.order.buyer.user_id != user_id:
            raise HTTPException(status_code=403, detail="Order item does not belong to buyer")
        if target != "CANCELLED":
            raise HTTPException(status_code=403, detail="Buyer can only cancel items")
        if item.status in {"DISPATCHED", "IN_TRANSIT", "DELIVERED"}:
            raise HTTPException(status_code=400, detail="Item can no longer be cancelled")
    elif role == "supplier":
        supplier = await _get_supplier_profile_by_user(session, user_id)
        if target not in {"DISPATCHED", "IN_TRANSIT", "DELIVERED"}:
            raise HTTPException(status_code=403, detail="Supplier cannot perform this transition")
        if not _assignment_owned_by_supplier(item, supplier.id):
            raise HTTPException(
                status_code=403,
                detail="Supplier does not own an accepted assignment for this item",
            )
    else:
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    previous_status = item.status
    item.status = target

    await _record_order_history(
        session,
        order_id=item.order_id,
        order_item_id=item.id,
        from_status=previous_status,
        to_status=target,
        changed_by=user_id,
    )

    if target == "CANCELLED":
        for assignment in item.assignments:
            if assignment.status == "ACCEPTED":
                await _restore_stock(session, assignment.catalog_id, item.quantity)
                assignment.status = "REJECTED"
            elif assignment.status == "PROPOSED":
                assignment.status = "REJECTED"

    if target == "DELIVERED":
        for assignment in item.assignments:
            if assignment.status == "ACCEPTED":
                assignment.status = "FULFILLED"

    if target in STATUS_EVENT_MAP:
        _queue_status_event(
            session,
            item.order,
            target,
            payload_extra={"order_item_id": item.id},
        )

    await _auto_advance_order_status(session, item.order, user_id)
    item.order.updated_at = _utc_timestamp()

    if commit:
        await _commit_and_flush_events(session)
    else:
        await session.flush()

    return item


async def confirm_assignment(
    session: AsyncSession,
    assignment_id: int,
    supplier_user: Dict,
) -> OrderAssignment:
    assignment = await _get_assignment_with_relations(session, assignment_id)

    if assignment.status != "PROPOSED":
        raise HTTPException(status_code=400, detail="Only proposed assignments can be confirmed")

    role = supplier_user.get("role")
    user_id = int(supplier_user.get("user_id"))
    if role not in {"supplier", "admin"}:
        raise HTTPException(status_code=403, detail="Only suppliers or admins can confirm assignments")

    if role == "supplier":
        supplier = await _get_supplier_profile_by_user(session, user_id)
        if assignment.supplier_id != supplier.id:
            raise HTTPException(status_code=403, detail="Assignment does not belong to supplier")

    stock_ok = await decrement_stock(
        session,
        catalog_id=assignment.catalog_id,
        quantity=assignment.order_item.quantity,
    )
    if not stock_ok:
        raise HTTPException(status_code=400, detail="Insufficient stock for this assignment")

    assignment.status = "ACCEPTED"
    for sibling in assignment.order_item.assignments:
        if sibling.id != assignment.id and sibling.status == "PROPOSED":
            sibling.status = "REJECTED"

    await transition_item_status(
        session,
        assignment.order_item_id,
        "CONFIRMED",
        {"user_id": user_id, "role": "admin"},
        commit=False,
    )

    await _commit_and_flush_events(session)
    await session.refresh(assignment)
    return assignment


async def reject_assignment(
    session: AsyncSession,
    assignment_id: int,
    supplier_user: Dict,
) -> OrderAssignment:
    assignment = await _get_assignment_with_relations(session, assignment_id)

    role = supplier_user.get("role")
    user_id = int(supplier_user.get("user_id"))
    if role not in {"supplier", "admin"}:
        raise HTTPException(status_code=403, detail="Only suppliers or admins can reject assignments")

    if role == "supplier":
        supplier = await _get_supplier_profile_by_user(session, user_id)
        if assignment.supplier_id != supplier.id:
            raise HTTPException(status_code=403, detail="Assignment does not belong to supplier")

    if assignment.status == "FULFILLED":
        raise HTTPException(status_code=400, detail="Fulfilled assignment cannot be rejected")
    if assignment.status == "REJECTED":
        return assignment

    assignment.status = "REJECTED"

    item = assignment.order_item
    active_assignments = [
        row for row in item.assignments if row.status in {"PROPOSED", "ACCEPTED", "FULFILLED"}
    ]
    if item.status == "MATCHED" and len(active_assignments) == 0:
        previous_status = item.status
        item.status = "PENDING"
        await _record_order_history(
            session,
            order_id=item.order_id,
            order_item_id=item.id,
            from_status=previous_status,
            to_status="PENDING",
            changed_by=user_id,
        )

    await _commit_and_flush_events(session)
    await session.refresh(assignment)
    return assignment


async def cancel_order(
    session: AsyncSession,
    order_id: int,
    user: Dict,
) -> Order:
    order = await _get_order_with_relations(session, order_id)

    role = user.get("role")
    user_id = int(user.get("user_id"))

    if order.status in {"DISPATCHED", "IN_TRANSIT", "DELIVERED"}:
        raise HTTPException(status_code=400, detail="Order can no longer be cancelled")

    if role == "buyer":
        if not order.buyer or order.buyer.user_id != user_id:
            raise HTTPException(status_code=403, detail="Order does not belong to buyer")
    elif role != "admin":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    for item in order.items:
        if item.status not in {"CANCELLED", "DELIVERED"}:
            previous_status = item.status
            item.status = "CANCELLED"
            await _record_order_history(
                session,
                order_id=order.id,
                order_item_id=item.id,
                from_status=previous_status,
                to_status="CANCELLED",
                changed_by=user_id,
            )

        for assignment in item.assignments:
            if assignment.status == "ACCEPTED":
                await _restore_stock(session, assignment.catalog_id, item.quantity)
                assignment.status = "REJECTED"
            elif assignment.status == "PROPOSED":
                assignment.status = "REJECTED"

    previous_order_status = order.status
    order.status = "CANCELLED"
    order.updated_at = _utc_timestamp()
    await _record_order_history(
        session,
        order_id=order.id,
        from_status=previous_order_status,
        to_status="CANCELLED",
        changed_by=user_id,
    )

    _queue_status_event(session, order, "CANCELLED")
    await _commit_and_flush_events(session)
    return order


def serialize_order_assignment(
    assignment: OrderAssignment,
    buyer: Optional[BuyerProfile],
) -> OrderAssignmentResponse:
    supplier = assignment.supplier
    distance_km: Optional[float] = None
    if supplier and buyer:
        distance_km = round(
            haversine_km(
                buyer.latitude,
                buyer.longitude,
                supplier.latitude,
                supplier.longitude,
            ),
            2,
        )

    return OrderAssignmentResponse(
        id=assignment.id,
        order_item_id=assignment.order_item_id,
        supplier_id=assignment.supplier_id,
        catalog_id=assignment.catalog_id,
        assigned_price=assignment.assigned_price,
        match_score=assignment.match_score,
        status=assignment.status,
        created_at=assignment.created_at,
        supplier_business_name=supplier.business_name if supplier else None,
        supplier_user_id=supplier.user_id if supplier else None,
        supplier_latitude=supplier.latitude if supplier else None,
        supplier_longitude=supplier.longitude if supplier else None,
        distance_km=distance_km,
    )


def _pick_item_price(item: OrderItem) -> float:
    preferred = next(
        (row for row in item.assignments if row.status in {"ACCEPTED", "FULFILLED"}),
        None,
    )
    if not preferred:
        preferred = next((row for row in item.assignments if row.status == "PROPOSED"), None)
    if not preferred or preferred.assigned_price is None:
        return 0.0
    return float(preferred.assigned_price) * item.quantity


def serialize_order(order: Order, include_history: bool = False) -> OrderResponse:
    buyer = order.buyer
    item_responses: List[OrderItemResponse] = []
    total_value = 0.0

    for item in order.items:
        item_assignments = [
            serialize_order_assignment(assignment, buyer)
            for assignment in sorted(item.assignments, key=lambda row: row.id)
        ]
        item_responses.append(
            OrderItemResponse(
                id=item.id,
                order_id=item.order_id,
                category_id=item.category_id,
                part_number=item.part_number,
                part_description=item.part_description,
                quantity=item.quantity,
                status=item.status,
                category_name=item.category.name if item.category else None,
                assignments=item_assignments,
            )
        )
        total_value += _pick_item_price(item)

    history_rows: List[OrderHistoryEntry] = []
    if include_history:
        history_rows = [
            OrderHistoryEntry(
                order_item_id=row.order_item_id,
                from_status=row.from_status,
                to_status=row.to_status,
                timestamp=row.created_at,
                changed_by=row.changed_by,
            )
            for row in sorted(order.history, key=lambda row: row.id)
        ]

    return OrderResponse(
        id=order.id,
        buyer_id=order.buyer_id,
        status=order.status,
        urgency=order.urgency,
        required_delivery_date=order.required_delivery_date,
        created_at=order.created_at,
        updated_at=order.updated_at,
        buyer_factory_name=buyer.factory_name if buyer else None,
        buyer_user_id=buyer.user_id if buyer else None,
        buyer_latitude=buyer.latitude if buyer else None,
        buyer_longitude=buyer.longitude if buyer else None,
        total_items=len(order.items),
        total_value=round(total_value, 2),
        items=item_responses,
        history=history_rows,
    )


async def list_orders_for_role(
    session: AsyncSession,
    user: Dict,
    status_filter: Optional[str],
    urgency_filter: Optional[str],
    start_date: Optional[str],
    end_date: Optional[str],
    buyer_filter: Optional[int],
    supplier_filter: Optional[int],
    page: int,
    page_size: int,
) -> tuple[List[Order], int]:
    role = user.get("role")
    user_id = int(user.get("user_id"))

    base_conditions = []
    if status_filter:
        base_conditions.append(Order.status == status_filter.upper())
    if urgency_filter:
        base_conditions.append(Order.urgency == urgency_filter.lower())
    if start_date:
        base_conditions.append(Order.created_at >= start_date)
    if end_date:
        base_conditions.append(Order.created_at <= end_date)

    if role == "buyer":
        buyer_profile_result = await session.execute(
            select(BuyerProfile).where(BuyerProfile.user_id == user_id)
        )
        buyer_profile = buyer_profile_result.scalar_one_or_none()
        if not buyer_profile:
            raise HTTPException(status_code=404, detail="Buyer profile not found")
        base_conditions.append(Order.buyer_id == buyer_profile.id)
    elif role == "supplier":
        supplier_profile = await _get_supplier_profile_by_user(session, user_id)
        supplier_subquery = (
            select(Order.id)
            .join(OrderItem, OrderItem.order_id == Order.id)
            .join(OrderAssignment, OrderAssignment.order_item_id == OrderItem.id)
            .where(OrderAssignment.supplier_id == supplier_profile.id)
        )
        base_conditions.append(Order.id.in_(supplier_subquery))
    elif role == "admin":
        if buyer_filter:
            base_conditions.append(Order.buyer_id == buyer_filter)
        if supplier_filter:
            supplier_subquery = (
                select(Order.id)
                .join(OrderItem, OrderItem.order_id == Order.id)
                .join(OrderAssignment, OrderAssignment.order_item_id == OrderItem.id)
                .where(OrderAssignment.supplier_id == supplier_filter)
            )
            base_conditions.append(Order.id.in_(supplier_subquery))
    else:
        raise HTTPException(status_code=403, detail="Unsupported role")

    conditions = and_(*base_conditions) if base_conditions else None

    count_stmt = select(func.count(Order.id))
    if conditions is not None:
        count_stmt = count_stmt.where(conditions)
    total_result = await session.execute(count_stmt)
    total = total_result.scalar_one()

    stmt = (
        select(Order)
        .options(
            selectinload(Order.buyer).selectinload(BuyerProfile.user),
            selectinload(Order.items).selectinload(OrderItem.category),
            selectinload(Order.items)
            .selectinload(OrderItem.assignments)
            .selectinload(OrderAssignment.supplier)
            .selectinload(SupplierProfile.user),
        )
        .order_by(Order.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )
    if conditions is not None:
        stmt = stmt.where(conditions)

    result = await session.execute(stmt)
    return result.scalars().unique().all(), total


async def get_order_history(session: AsyncSession, order_id: int) -> List[OrderHistoryEntry]:
    order = await _get_order_with_relations(session, order_id)
    return [
        OrderHistoryEntry(
            order_item_id=row.order_item_id,
            from_status=row.from_status,
            to_status=row.to_status,
            timestamp=row.created_at,
            changed_by=row.changed_by,
        )
        for row in sorted(order.history, key=lambda row: row.id)
    ]
