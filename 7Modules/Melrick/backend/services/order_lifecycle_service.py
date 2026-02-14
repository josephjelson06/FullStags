from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.inventory import InventoryTransaction, PartsCatalog
from ..models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from ..models.users import BuyerProfile, SupplierProfile
from .integration_events import emit_low_stock_alert, emit_order_status_event

VALID_ORDER_TRANSITIONS = {
    "PLACED": {"MATCHED", "CANCELLED"},
    "MATCHED": {"CONFIRMED", "CANCELLED"},
    "CONFIRMED": {"DISPATCHED", "CANCELLED"},
    "DISPATCHED": {"IN_TRANSIT", "CANCELLED"},
    "IN_TRANSIT": {"DELIVERED", "CANCELLED"},
    "DELIVERED": set(),
    "CANCELLED": set(),
}

EVENT_BY_STATUS = {
    "CONFIRMED": "ORDER_CONFIRMED",
    "DISPATCHED": "ORDER_DISPATCHED",
    "IN_TRANSIT": "ORDER_IN_TRANSIT",
    "DELIVERED": "ORDER_DELIVERED",
    "CANCELLED": "ORDER_CANCELLED",
}

ITEM_STATUSES = {"MATCHED", "CONFIRMED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "CANCELLED"}


async def _load_order(session: AsyncSession, order_id: int) -> Order:
    order = await session.get(Order, order_id)
    if order is None:
        raise ValueError(f"Order {order_id} not found")
    return order


async def _load_order_items(session: AsyncSession, order_id: int) -> List[OrderItem]:
    return (
        await session.execute(
            select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.id.asc())
        )
    ).scalars().all()


async def _load_assignments_for_items(session: AsyncSession, item_ids: List[int]) -> List[OrderAssignment]:
    if not item_ids:
        return []
    return (
        await session.execute(
            select(OrderAssignment)
            .where(OrderAssignment.order_item_id.in_(item_ids))
            .order_by(OrderAssignment.id.asc())
        )
    ).scalars().all()


async def _target_users_for_order(
    session: AsyncSession,
    order: Order,
    assignments: List[OrderAssignment],
) -> Dict[str, object]:
    buyer_profile = await session.get(BuyerProfile, order.buyer_id)
    buyer_user_id = buyer_profile.user_id if buyer_profile else None

    supplier_ids = sorted({assignment.supplier_id for assignment in assignments if assignment.supplier_id is not None})
    supplier_user_ids: List[int] = []
    supplier_profiles: Dict[int, SupplierProfile] = {}
    if supplier_ids:
        supplier_rows = (
            await session.execute(select(SupplierProfile).where(SupplierProfile.id.in_(supplier_ids)))
        ).scalars().all()
        for supplier in supplier_rows:
            supplier_profiles[supplier.id] = supplier
            if supplier.user_id:
                supplier_user_ids.append(int(supplier.user_id))

    return {
        "buyer_user_id": int(buyer_user_id) if buyer_user_id else None,
        "supplier_user_ids": supplier_user_ids,
        "supplier_profiles": supplier_profiles,
    }


async def confirm_order_assignments(
    session: AsyncSession,
    order_id: int,
    changed_by_user_id: Optional[int] = None,
    low_stock_threshold: int = 5,
    emit_confirmed_event: bool = False,
) -> Dict:
    order = await _load_order(session, order_id)
    items = await _load_order_items(session, order_id)
    assignments = await _load_assignments_for_items(session, [item.id for item in items])
    if not assignments:
        raise ValueError(f"Order {order_id} has no assignments to confirm")

    assignment_by_item_id = {assignment.order_item_id: assignment for assignment in assignments}

    low_stock_candidates: List[Dict] = []
    accepted_assignment_ids: List[int] = []

    for item in items:
        assignment = assignment_by_item_id.get(item.id)
        if assignment is None or assignment.status == "REJECTED":
            continue

        if assignment.status != "ACCEPTED":
            assignment.status = "ACCEPTED"
        accepted_assignment_ids.append(assignment.id)

        if item.status != "CONFIRMED":
            previous_item_status = item.status
            item.status = "CONFIRMED"
            session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    order_item_id=item.id,
                    from_status=previous_item_status,
                    to_status="CONFIRMED",
                    changed_by=changed_by_user_id,
                )
            )

        catalog = await session.get(PartsCatalog, assignment.catalog_id)
        if catalog is None:
            continue
        change_amount = -int(item.quantity)
        catalog.quantity_in_stock = max(0, int(catalog.quantity_in_stock) + change_amount)
        session.add(
            InventoryTransaction(
                catalog_id=catalog.id,
                change_amount=change_amount,
                reason="order_confirmed",
            )
        )

        reorder_point = max(int(catalog.min_order_quantity or 1) * 2, low_stock_threshold)
        if catalog.quantity_in_stock <= reorder_point:
            low_stock_candidates.append(
                {
                    "catalog_id": catalog.id,
                    "supplier_id": assignment.supplier_id,
                    "part_number": catalog.part_number,
                    "current_quantity": int(catalog.quantity_in_stock),
                    "threshold_quantity": reorder_point,
                }
            )

    previous_order_status = order.status
    if order.status != "CONFIRMED":
        order.status = "CONFIRMED"
        session.add(
            OrderStatusHistory(
                order_id=order.id,
                order_item_id=None,
                from_status=previous_order_status,
                to_status="CONFIRMED",
                changed_by=changed_by_user_id,
            )
        )

    context = await _target_users_for_order(session, order, assignments)
    supplier_profiles: Dict[int, SupplierProfile] = context["supplier_profiles"]  # type: ignore[assignment]
    await session.commit()

    for candidate in low_stock_candidates:
        supplier_profile = supplier_profiles.get(candidate["supplier_id"])
        if supplier_profile and supplier_profile.user_id:
            await emit_low_stock_alert(
                supplier_user_id=int(supplier_profile.user_id),
                catalog_id=int(candidate["catalog_id"]),
                current_quantity=int(candidate["current_quantity"]),
                threshold_quantity=int(candidate["threshold_quantity"]),
                part_number=candidate["part_number"],
            )

    if emit_confirmed_event:
        await emit_order_status_event(
            event_type="ORDER_CONFIRMED",
            order_id=order.id,
            buyer_user_id=context["buyer_user_id"],  # type: ignore[arg-type]
            supplier_user_ids=context["supplier_user_ids"],  # type: ignore[arg-type]
            payload={
                "order_assignment_ids": accepted_assignment_ids,
                "changed_by": changed_by_user_id,
            },
        )

    return {
        "order_id": order.id,
        "accepted_assignment_ids": accepted_assignment_ids,
        "low_stock_alerts": low_stock_candidates,
    }


async def transition_order_status(
    session: AsyncSession,
    order_id: int,
    to_status: str,
    changed_by_user_id: Optional[int] = None,
    emit_event: bool = True,
) -> Order:
    order = await _load_order(session, order_id)
    from_status = order.status
    if from_status == to_status:
        return order

    allowed_targets = VALID_ORDER_TRANSITIONS.get(from_status, set())
    if to_status not in allowed_targets:
        raise ValueError(f"Invalid order status transition {from_status} -> {to_status}")

    items = await _load_order_items(session, order_id)
    assignments = await _load_assignments_for_items(session, [item.id for item in items])

    order.status = to_status
    session.add(
        OrderStatusHistory(
            order_id=order.id,
            order_item_id=None,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by_user_id,
        )
    )

    if to_status in ITEM_STATUSES:
        for item in items:
            previous_item_status = item.status
            if previous_item_status == to_status:
                continue
            item.status = to_status
            session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    order_item_id=item.id,
                    from_status=previous_item_status,
                    to_status=to_status,
                    changed_by=changed_by_user_id,
                )
            )

    if to_status == "CANCELLED":
        for assignment in assignments:
            if assignment.status not in {"FULFILLED", "REJECTED"}:
                assignment.status = "REJECTED"
    if to_status == "DELIVERED":
        for assignment in assignments:
            if assignment.status != "REJECTED":
                assignment.status = "FULFILLED"

    context = await _target_users_for_order(session, order, assignments)
    await session.commit()

    if emit_event:
        event_type = EVENT_BY_STATUS.get(to_status)
        if event_type:
            await emit_order_status_event(
                event_type=event_type,
                order_id=order.id,
                buyer_user_id=context["buyer_user_id"],  # type: ignore[arg-type]
                supplier_user_ids=context["supplier_user_ids"],  # type: ignore[arg-type]
                payload={"changed_by": changed_by_user_id},
            )

    return order
