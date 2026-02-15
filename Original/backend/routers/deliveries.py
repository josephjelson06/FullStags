from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import RoleChecker, get_current_user
from ..models.user import User
from ..schemas.delivery import (
    AvailableAssignmentResponse,
    DeliveryResponse,
    DeliveryStatsResponse,
    DeliveryStatusUpdate,
    VRPBatchRequest,
    VRPBatchResult,
)
from ..services.routing_service import (
    create_batched_delivery,
    create_single_delivery,
    get_available_confirmed_assignments,
    get_delivery_for_user,
    get_delivery_route_geometry,
    get_delivery_stats,
    list_deliveries_for_user,
    update_delivery_status,
    update_eta,
)


class SingleDeliveryRequest(BaseModel):
    order_assignment_id: int = Field(
        ..., gt=0, description="Confirmed order assignment ID"
    )

    model_config = {"json_schema_extra": {"example": {"order_assignment_id": 42}}}


router = APIRouter(prefix="/api/deliveries", tags=["deliveries"])

ERROR_RESPONSES = {
    400: {"description": "Bad request or invalid state transition"},
    401: {"description": "Missing or invalid JWT"},
    403: {"description": "Role not authorized for this operation"},
    404: {"description": "Delivery or assignment not found"},
    422: {"description": "Validation error"},
}


@router.post(
    "/single",
    response_model=DeliveryResponse,
    summary="Create single delivery",
    description="Creates a planned delivery with pickup/dropoff stops for one confirmed assignment.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def create_single(
    request: SingleDeliveryRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await create_single_delivery(
            session=session,
            order_assignment_id=request.order_assignment_id,
            created_by_user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/batch",
    response_model=VRPBatchResult,
    summary="Create batched VRP deliveries",
    description="Runs OR-Tools VRP across confirmed assignments and creates one or more optimized deliveries.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def create_batch(
    request: VRPBatchRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deliveries = await create_batched_delivery(
            session=session,
            order_assignment_ids=request.order_assignment_ids,
            created_by_user_id=current_user.id,
        )

        total_naive = sum(
            float(delivery.get("naive_distance_km") or 0.0) for delivery in deliveries
        )
        total_optimized = sum(
            float(delivery.get("optimized_distance_km") or 0.0)
            for delivery in deliveries
        )
        total_savings = max(0.0, total_naive - total_optimized)
        total_savings_percent = (
            (total_savings / total_naive * 100.0) if total_naive > 0 else 0.0
        )

        return {
            "deliveries_created": deliveries,
            "total_savings_km": total_savings,
            "total_savings_percent": total_savings_percent,
        }
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/",
    response_model=List[DeliveryResponse],
    summary="List deliveries visible to current user",
    description="Admin sees all, supplier sees their assignments, buyer sees their orders' deliveries.",
    responses=ERROR_RESPONSES,
)
async def list_deliveries(
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    user_dict = {"role": user.role, "sub": user.id}
    return await list_deliveries_for_user(session=session, user=user_dict)


@router.get(
    "/assignments/available",
    response_model=List[AvailableAssignmentResponse],
    summary="List confirmed assignments not yet routed",
    description="Used by delivery planner UI to pick assignments for single or batch optimization.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def available_assignments(
    session: AsyncSession = Depends(get_db),
):
    return await get_available_confirmed_assignments(session)


@router.get(
    "/stats",
    response_model=DeliveryStatsResponse,
    summary="Get delivery optimization statistics",
    description="Returns average route metrics and aggregate batched-route savings.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def delivery_stats(
    session: AsyncSession = Depends(get_db),
):
    return await get_delivery_stats(session)


@router.get(
    "/{delivery_id}",
    response_model=DeliveryResponse,
    summary="Get delivery detail",
    description="Returns delivery, ordered stops, route geometry, and latest ETA.",
    responses=ERROR_RESPONSES,
)
async def get_delivery(
    delivery_id: int = Path(..., gt=0, description="Delivery ID"),
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        user_dict = {"role": user.role, "sub": user.id}
        return await get_delivery_for_user(
            session=session, delivery_id=delivery_id, user=user_dict
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get(
    "/{delivery_id}/route",
    summary="Get delivery route geometry",
    description="Returns GeoJSON LineString for map rendering.",
    responses=ERROR_RESPONSES,
)
async def get_delivery_route(
    delivery_id: int = Path(..., gt=0, description="Delivery ID"),
    session: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    try:
        user_dict = {"role": user.role, "sub": user.id}
        return await get_delivery_route_geometry(
            session=session, delivery_id=delivery_id, user=user_dict
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.patch(
    "/{delivery_id}/status",
    response_model=DeliveryResponse,
    summary="Update delivery status",
    description="Valid transitions: PLANNED -> IN_PROGRESS -> COMPLETED.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def patch_delivery_status(
    payload: DeliveryStatusUpdate,
    delivery_id: int = Path(..., gt=0, description="Delivery ID"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await update_delivery_status(
            session=session,
            delivery_id=delivery_id,
            status=payload.status,
            changed_by_user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post(
    "/{delivery_id}/update-eta",
    response_model=DeliveryResponse,
    summary="Recompute delivery ETA",
    description="Re-estimates pending stop ETAs from current time and logs ETA snapshot.",
    dependencies=[Depends(RoleChecker(["admin"]))],
    responses=ERROR_RESPONSES,
)
async def patch_delivery_eta(
    delivery_id: int = Path(..., gt=0, description="Delivery ID"),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return await update_eta(
            session=session,
            delivery_id=delivery_id,
            changed_by_user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
