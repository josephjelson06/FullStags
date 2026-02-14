from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.user import BuyerProfile, User
from backend.schemas.orders import (
    AssignmentStatusUpdateRequest,
    OrderCreateRequest,
    OrderItemResponse,
    OrderResponse,
    OrderStatusUpdateRequest,
)
from backend.services.order_service import create_order, list_orders_for_user, update_assignment_status, update_order_status

router = APIRouter(prefix="/api/orders", tags=["orders"])


async def _build_order_response(order: Order, db: AsyncSession) -> OrderResponse:
    item_result = await db.execute(select(OrderItem).where(OrderItem.order_id == order.id).order_by(OrderItem.id.asc()))
    items = item_result.scalars().all()
    item_ids = [item.id for item in items]

    assignment_map: dict[int, list[OrderAssignment]] = {}
    if item_ids:
        assignment_result = await db.execute(
            select(OrderAssignment).where(OrderAssignment.order_item_id.in_(item_ids)).order_by(OrderAssignment.id.asc())
        )
        assignments = assignment_result.scalars().all()
        for assignment in assignments:
            assignment_map.setdefault(int(assignment.order_item_id), []).append(assignment)

    item_responses = [
        OrderItemResponse(
            id=item.id,
            order_id=item.order_id,
            category_id=item.category_id,
            part_number=item.part_number,
            part_description=item.part_description,
            quantity=item.quantity,
            status=item.status,
            assignments=assignment_map.get(item.id, []),
        )
        for item in items
    ]
    return OrderResponse(
        id=order.id,
        buyer_id=order.buyer_id,
        status=order.status,
        urgency=order.urgency,
        required_delivery_date=order.required_delivery_date,
        created_at=order.created_at,
        updated_at=order.updated_at,
        items=item_responses,
    )


async def _can_access_order(order: Order, current_user: User, db: AsyncSession) -> bool:
    if current_user.role == "admin":
        return True
    if current_user.role == "buyer":
        result = await db.execute(select(BuyerProfile).where(BuyerProfile.user_id == current_user.id))
        profile = result.scalar_one_or_none()
        return profile is not None and profile.id == order.buyer_id

    orders_for_user = await list_orders_for_user(db=db, current_user=current_user)
    return any(candidate.id == order.id for candidate in orders_for_user)


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(RoleChecker(["buyer"]))])
async def place_order(
    payload: OrderCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        order = await create_order(db=db, current_user=current_user, payload=payload)
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return await _build_order_response(order, db)


@router.get("/", response_model=list[OrderResponse])
async def list_orders(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    orders = await list_orders_for_user(db=db, current_user=current_user)
    responses: list[OrderResponse] = []
    for order in orders:
        responses.append(await _build_order_response(order, db))
    return responses


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(Order).where(Order.id == order_id))
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")

    if not await _can_access_order(order, current_user, db):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    return await _build_order_response(order, db)


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def patch_order_status(
    order_id: int,
    payload: OrderStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        order = await update_order_status(
            db=db,
            current_user=current_user,
            order_id=order_id,
            new_status=payload.status,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return await _build_order_response(order, db)


@router.patch("/assignments/{assignment_id}/status", response_model=dict)
async def patch_assignment_status(
    assignment_id: int,
    payload: AssignmentStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        assignment = await update_assignment_status(
            db=db,
            current_user=current_user,
            assignment_id=assignment_id,
            new_status=payload.status,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return {
        "id": assignment.id,
        "order_item_id": assignment.order_item_id,
        "supplier_id": assignment.supplier_id,
        "status": assignment.status,
    }
