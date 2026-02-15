from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import RoleChecker, get_current_user
from ..models.user import User
from ..models.matching import MatchingLog
from ..models.orders import Order, OrderItem
from ..schemas.matching import (
    MatchConfigResponse,
    MatchConfigUpdate,
    MatchLogEntry,
    MatchResult,
    MatchSimulationRequest,
    OrderSummary,
)
from ..services.matching_service import (
    load_weight_profiles,
    match_full_order,
    match_order_item,
    save_weight_profiles,
)

router = APIRouter(prefix="/api/matching", tags=["matching"])

ERROR_RESPONSES = {
    400: {"description": "Bad request or invalid payload"},
    401: {"description": "Missing or invalid JWT"},
    403: {"description": "Role not authorized for this operation"},
    404: {"description": "Order or order item not found"},
    422: {"description": "Validation error"},
}


@router.post(
    "/order/{order_id}",
    response_model=List[MatchResult],
    summary="Run matching for a full order",
    description="Scores suppliers for each order item, persists logs/assignments, and updates order to MATCHED.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def run_order_matching(
    order_id: int = Path(..., gt=0, description="Order ID in PLACED status"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        changed_by = current_user.id
        return await match_full_order(
            session, order_id, simulate=False, changed_by_user_id=changed_by
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/item/{item_id}",
    response_model=MatchResult,
    summary="Run matching for one order item",
    description="Returns ranked suppliers for a single item and persists explainability logs.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def run_item_matching(
    item_id: int = Path(..., gt=0, description="Order item ID"),
    session: AsyncSession = Depends(get_db),
):
    try:
        return await match_order_item(session, item_id, simulate=False)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post(
    "/simulate",
    summary="Dry-run matching simulation",
    description="Runs matching without creating assignments or changing order/item statuses.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def simulate_matching(
    request: MatchSimulationRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if request.order_id:
        return await match_full_order(
            session,
            request.order_id,
            simulate=True,
            changed_by_user_id=current_user.id,
        )
    if request.order_item_id:
        return await match_order_item(session, request.order_item_id, simulate=True)
    if request.item_ids:
        results = []
        for item_id in request.item_ids:
            results.append(await match_order_item(session, item_id, simulate=True))
        return results
    raise HTTPException(
        status_code=400, detail="Provide order_id, order_item_id, or item_ids"
    )


@router.get(
    "/logs/{order_item_id}",
    response_model=List[MatchLogEntry],
    summary="Fetch matching logs for one order item",
    description="Returns every candidate scored for audit/explainability.",
    responses=ERROR_RESPONSES,
)
async def get_matching_logs(
    order_item_id: int = Path(..., gt=0, description="Order item ID"),
    session: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await session.execute(
        select(MatchingLog)
        .where(MatchingLog.order_item_id == order_item_id)
        .order_by(MatchingLog.rank)
    )
    return result.scalars().all()


@router.get(
    "/config",
    response_model=MatchConfigResponse,
    summary="Get matching weight profiles",
    description="Returns configured scoring weights for standard/urgent/critical urgency tiers.",
    responses=ERROR_RESPONSES,
)
async def get_matching_config():
    profiles = load_weight_profiles()
    return {"weight_profiles": profiles}


@router.put(
    "/config",
    response_model=MatchConfigResponse,
    summary="Update matching weight profiles",
    description="Each urgency profile must keep weight sum at 1.0 (+/- 0.01).",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def update_matching_config(
    config: MatchConfigUpdate,
):
    try:
        profiles = load_weight_profiles()
        profiles.update(config.weight_profiles)
        validated = MatchConfigUpdate(weight_profiles=profiles)
        save_weight_profiles(validated.weight_profiles)
        return {"weight_profiles": validated.weight_profiles}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/orders/placed",
    response_model=List[OrderSummary],
    summary="List PLACED orders",
    description="Admin helper endpoint for selecting orders in matching workflows.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def list_placed_orders(
    session: AsyncSession = Depends(get_db),
):
    orders_result = await session.execute(select(Order).where(Order.status == "PLACED"))
    orders = orders_result.scalars().all()

    summaries: List[OrderSummary] = []
    for order in orders:
        items_result = await session.execute(
            select(OrderItem).where(OrderItem.order_id == order.id)
        )
        items = items_result.scalars().all()
        summaries.append(
            OrderSummary(
                id=order.id,
                status=order.status,
                urgency=order.urgency,
                required_delivery_date=order.required_delivery_date,
                items=items,
            )
        )
    return summaries
