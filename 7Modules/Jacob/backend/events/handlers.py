import importlib
import inspect
from typing import Any, Awaitable, Callable, Dict, List, Optional

from sqlalchemy import select

from backend.database import AsyncSessionLocal
from backend.models.order import OrderAssignment, OrderItem


async def _run_callable(func: Callable[..., Any], kwargs: Dict[str, Any]) -> Any:
    signature = inspect.signature(func)
    accepted = {
        key: value
        for key, value in kwargs.items()
        if key in signature.parameters
    }

    if "session" in signature.parameters:
        async with AsyncSessionLocal() as session:
            accepted["session"] = session
            result = func(**accepted)
            if inspect.isawaitable(result):
                return await result
            return result

    result = func(**accepted)
    if inspect.isawaitable(result):
        return await result
    return result


def _load_callable(candidates: List[str], fn_name: str) -> Optional[Callable[..., Any]]:
    for module_name in candidates:
        try:
            module = importlib.import_module(module_name)
        except Exception:  # noqa: BLE001
            continue
        func = getattr(module, fn_name, None)
        if callable(func):
            return func
    return None


async def _run_matching(order_id: int, payload: dict) -> None:
    matcher = _load_callable(
        [
            "backend.services.matching_service",
            "backend.services.matching",
            "services.matching_service",
            "services.matching",
        ],
        "match_full_order",
    )
    if not matcher:
        return

    await _run_callable(
        matcher,
        {
            "order_id": order_id,
            "payload": payload,
        },
    )


async def _run_routing_for_confirmed(order_id: int, payload: dict) -> None:
    delivery_builder = _load_callable(
        [
            "backend.services.delivery_service",
            "backend.services.routing_service",
            "services.delivery_service",
            "services.routing_service",
        ],
        "create_single_delivery",
    )
    if not delivery_builder:
        return

    order_item_id = payload.get("order_item_id")

    async with AsyncSessionLocal() as session:
        stmt = (
            select(OrderAssignment.id)
            .join(OrderItem, OrderAssignment.order_item_id == OrderItem.id)
            .where(OrderItem.order_id == order_id)
            .where(OrderAssignment.status.in_(["ACCEPTED", "FULFILLED"]))
        )
        if order_item_id:
            stmt = stmt.where(OrderAssignment.order_item_id == int(order_item_id))

        assignment_ids = [row[0] for row in (await session.execute(stmt)).all()]

    for assignment_id in assignment_ids:
        await _run_callable(
            delivery_builder,
            {
                "order_assignment_id": assignment_id,
                "assignment_id": assignment_id,
                "order_id": order_id,
                "payload": payload,
            },
        )


async def trigger_batch_optimization() -> bool:
    optimizer = _load_callable(
        [
            "backend.services.delivery_service",
            "backend.services.routing_service",
            "services.delivery_service",
            "services.routing_service",
        ],
        "optimize_batched_deliveries",
    )
    if not optimizer:
        optimizer = _load_callable(
            [
                "backend.services.delivery_service",
                "backend.services.routing_service",
                "services.delivery_service",
                "services.routing_service",
            ],
            "optimize_pending_deliveries",
        )
    if not optimizer:
        return False

    await _run_callable(optimizer, {})
    return True


async def handle_event(event_type: str, payload: dict, target_user_ids: List[int]) -> None:
    if event_type == "ORDER_PLACED":
        order_id = payload.get("order_id")
        if order_id is None:
            return
        await _run_matching(int(order_id), payload)
        return

    if event_type == "ORDER_CONFIRMED":
        order_id = payload.get("order_id")
        if order_id is None:
            return
        await _run_routing_for_confirmed(int(order_id), payload)
        return
