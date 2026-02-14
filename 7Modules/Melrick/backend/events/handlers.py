from __future__ import annotations

import logging
from typing import Dict, Iterable, List, Optional

from sqlalchemy import select

from ..database import AsyncSessionLocal
from ..models.delivery import DeliveryStop
from ..models.orders import Order, OrderAssignment, OrderItem
from ..services.matching_service import match_full_order
from ..services.routing_service import create_single_delivery

logger = logging.getLogger(__name__)


def _to_int(value: object) -> Optional[int]:
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _extract_order_id(payload: Dict) -> Optional[int]:
    direct = _to_int(payload.get("order_id"))
    if direct is not None:
        return direct

    if payload.get("entity_type") == "order":
        return _to_int(payload.get("entity_id"))

    return None


def _extract_assignment_ids(payload: Dict) -> List[int]:
    raw_ids = payload.get("order_assignment_ids") or payload.get("assignment_ids") or []
    if not isinstance(raw_ids, list):
        return []

    assignment_ids: List[int] = []
    for value in raw_ids:
        parsed = _to_int(value)
        if parsed is not None:
            assignment_ids.append(parsed)
    return list(dict.fromkeys(assignment_ids))


async def _query_confirmed_assignments(
    order_id: Optional[int] = None,
    assignment_ids: Optional[Iterable[int]] = None,
) -> List[int]:
    assignment_ids = list(dict.fromkeys(assignment_ids or []))
    assigned_subquery = (
        select(DeliveryStop.order_assignment_id)
        .where(DeliveryStop.order_assignment_id.is_not(None))
        .distinct()
    )

    stmt = (
        select(OrderAssignment.id)
        .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.status == "CONFIRMED",
            OrderAssignment.status.in_(["ACCEPTED", "PROPOSED"]),
            OrderAssignment.id.not_in(assigned_subquery),
        )
        .order_by(OrderAssignment.id.asc())
    )

    if order_id is not None:
        stmt = stmt.where(Order.id == order_id)
    if assignment_ids:
        stmt = stmt.where(OrderAssignment.id.in_(assignment_ids))

    async with AsyncSessionLocal() as session:
        result = await session.execute(stmt)
        return list(dict.fromkeys(result.scalars().all()))


async def _handle_order_placed(payload: Dict) -> None:
    order_id = _extract_order_id(payload)
    if order_id is None:
        logger.warning("ORDER_PLACED event missing order_id: %s", payload)
        return

    changed_by = _to_int(payload.get("changed_by"))

    async with AsyncSessionLocal() as session:
        order = await session.get(Order, order_id)
        if order is None:
            logger.warning("ORDER_PLACED event for unknown order_id=%s", order_id)
            return
        if order.status != "PLACED":
            logger.info("Skipping auto-match for order_id=%s with status=%s", order_id, order.status)
            return

        try:
            await match_full_order(
                session=session,
                order_id=order_id,
                simulate=False,
                changed_by_user_id=changed_by,
            )
        except ValueError as exc:
            logger.warning("Auto-match failed for order_id=%s: %s", order_id, exc)


async def _handle_order_confirmed(payload: Dict) -> None:
    order_id = _extract_order_id(payload)
    assignment_ids = _extract_assignment_ids(payload)
    changed_by = _to_int(payload.get("changed_by"))

    if order_id is None and not assignment_ids:
        logger.warning("ORDER_CONFIRMED event missing scope fields: %s", payload)
        return

    candidate_assignment_ids = await _query_confirmed_assignments(order_id=order_id, assignment_ids=assignment_ids)
    if not candidate_assignment_ids:
        logger.info("No confirmed assignments available for ORDER_CONFIRMED payload=%s", payload)
        return

    async with AsyncSessionLocal() as session:
        for assignment_id in candidate_assignment_ids:
            try:
                await create_single_delivery(
                    session=session,
                    order_assignment_id=assignment_id,
                    created_by_user_id=changed_by,
                )
            except ValueError as exc:
                logger.warning("Auto-delivery failed for assignment_id=%s: %s", assignment_id, exc)


EVENT_HANDLERS = {
    "ORDER_PLACED": _handle_order_placed,
    "ORDER_CONFIRMED": _handle_order_confirmed,
}


async def dispatch_event(event_type: str, payload: Dict, target_user_ids: List[int]) -> None:
    handler = EVENT_HANDLERS.get(event_type)
    if handler is None:
        return

    try:
        await handler(payload)
    except Exception:
        logger.exception("Unhandled error in event handler for %s", event_type)
