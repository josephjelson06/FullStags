from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from ..models.users import SupplierProfile


def _clamp(value: float, min_value: float = 0.0, max_value: float = 1.0) -> float:
    return max(min_value, min(max_value, value))


async def update_reliability_score(session: AsyncSession, supplier_id: int) -> float:
    assignment_result = await session.execute(
        select(OrderAssignment).where(OrderAssignment.supplier_id == supplier_id)
    )
    assignments = assignment_result.scalars().all()
    if not assignments:
        supplier = await session.get(SupplierProfile, supplier_id)
        return supplier.reliability_score if supplier else 0.5

    delivered = 0
    delivered_on_time = 0
    cancelled = 0

    for assignment in assignments:
        if assignment.status == "REJECTED":
            cancelled += 1

        if assignment.status != "FULFILLED":
            continue

        delivered += 1
        item_result = await session.execute(
            select(OrderItem, Order)
            .join(Order, Order.id == OrderItem.order_id)
            .where(OrderItem.id == assignment.order_item_id)
        )
        item_row = item_result.first()
        if not item_row:
            continue
        order_item, order = item_row

        status_result = await session.execute(
            select(OrderStatusHistory)
            .where(
                OrderStatusHistory.order_item_id == order_item.id,
                OrderStatusHistory.to_status == "DELIVERED",
            )
            .order_by(OrderStatusHistory.created_at.desc())
        )
        status_entry = status_result.scalars().first()
        if not status_entry:
            delivered_on_time += 1
            continue

        delivered_at = status_entry.created_at
        if delivered_at and delivered_at.tzinfo is None:
            delivered_at = delivered_at.replace(tzinfo=timezone.utc)

        required = order.required_delivery_date
        if required and required.tzinfo is None:
            required = required.replace(tzinfo=timezone.utc)

        if not required or not delivered_at or delivered_at <= required:
            delivered_on_time += 1

    on_time_rate = (delivered_on_time / delivered) if delivered else 0.0
    cancellation_penalty = (cancelled / len(assignments)) * 0.5

    score = _clamp(on_time_rate - cancellation_penalty)

    supplier = await session.get(SupplierProfile, supplier_id)
    if supplier:
        supplier.reliability_score = score
        await session.commit()

    return score
