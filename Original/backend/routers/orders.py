from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.user import User
from backend.models.users import BuyerProfile, SupplierProfile
from backend.schemas.order import (
    OrderAssignmentCreate,
    OrderAssignmentResponse,
    OrderCreate,
    OrderHistoryEntry,
    OrderResponse,
    OrdersListResponse,
    StatusTransitionRequest,
)
from backend.services.order_service import (
    assign_supplier_to_item,
    cancel_order,
    confirm_assignment,
    get_assignment_with_details,
    get_order_history,
    get_order_with_details,
    list_orders_for_role,
    reject_assignment,
    serialize_order,
    serialize_order_assignment,
    transition_item_status,
    transition_order_status,
    create_order,
)

router = APIRouter(prefix="/api/orders", tags=["orders"])


def _normalize_optional(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = value.strip()
    return cleaned if cleaned else None


async def _buyer_profile_for_user(session: AsyncSession, user_id: int) -> BuyerProfile:
    result = await session.execute(
        select(BuyerProfile).where(BuyerProfile.user_id == user_id)
    )
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found")
    return buyer


async def _supplier_profile_for_user(
    session: AsyncSession, user_id: int
) -> SupplierProfile:
    result = await session.execute(
        select(SupplierProfile).where(SupplierProfile.user_id == user_id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    return supplier


def _ensure_order_access(
    order: OrderResponse, user: User, supplier_id: Optional[int] = None
) -> None:
    role = user.role
    user_id = user.id

    if role == "admin":
        return
    if role == "buyer":
        if order.buyer_user_id != user_id:
            raise HTTPException(
                status_code=403, detail="Order does not belong to buyer"
            )
        return
    if role == "supplier":
        if supplier_id is None:
            raise HTTPException(status_code=403, detail="Supplier profile is required")
        owns_assignment = any(
            assignment.supplier_id == supplier_id
            for item in order.items
            for assignment in item.assignments
        )
        if not owns_assignment:
            raise HTTPException(
                status_code=403, detail="Order is not assigned to supplier"
            )
        return

    raise HTTPException(status_code=403, detail="Insufficient permissions")


@router.post(
    "/",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RoleChecker(["buyer"]))],
)
async def create_order_route(
    payload: OrderCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    buyer = await _buyer_profile_for_user(session, current_user.id)
    order = await create_order(session, buyer.id, payload, changed_by=current_user.id)
    return serialize_order(order, include_history=True)


@router.get(
    "/",
    response_model=OrdersListResponse,
    dependencies=[Depends(RoleChecker(["buyer", "supplier", "admin"]))],
)
async def list_orders_route(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    status_filter: Optional[str] = Query(None, alias="status"),
    urgency: Optional[str] = Query(None),
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    buyer_id: Optional[int] = Query(None),
    supplier_id: Optional[int] = Query(None),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    user_dict = {"role": current_user.role, "user_id": current_user.id}
    orders, total = await list_orders_for_role(
        session=session,
        user=user_dict,
        status_filter=_normalize_optional(status_filter),
        urgency_filter=_normalize_optional(urgency),
        start_date=_normalize_optional(start_date),
        end_date=_normalize_optional(end_date),
        buyer_filter=buyer_id,
        supplier_filter=supplier_id,
        page=page,
        page_size=page_size,
    )

    return OrdersListResponse(
        items=[serialize_order(order, include_history=False) for order in orders],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/{order_id}",
    response_model=OrderResponse,
    dependencies=[Depends(RoleChecker(["buyer", "supplier", "admin"]))],
)
async def get_order_detail(
    order_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await get_order_with_details(session, order_id)
    serialized = serialize_order(order, include_history=True)

    supplier_id: Optional[int] = None
    if current_user.role == "supplier":
        supplier = await _supplier_profile_for_user(session, current_user.id)
        supplier_id = supplier.id

    _ensure_order_access(serialized, current_user, supplier_id=supplier_id)
    return serialized


@router.patch(
    "/{order_id}/status",
    response_model=OrderResponse,
    dependencies=[Depends(RoleChecker(["buyer", "admin"]))],
)
async def patch_order_status(
    order_id: int,
    payload: StatusTransitionRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    new_status = payload.new_status.strip().upper()
    if new_status == "CANCELLED":
        order = await cancel_order(session, order_id, current_user)
    else:
        order = await transition_order_status(
            session, order_id, new_status, current_user
        )
    detailed = await get_order_with_details(session, order.id)
    return serialize_order(detailed, include_history=True)


@router.patch(
    "/items/{item_id}/status",
    response_model=OrderResponse,
    dependencies=[Depends(RoleChecker(["buyer", "supplier", "admin"]))],
)
async def patch_item_status(
    item_id: int,
    payload: StatusTransitionRequest,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    item = await transition_item_status(
        session,
        item_id,
        payload.new_status.strip().upper(),
        current_user,
    )
    order = await get_order_with_details(session, item.order_id)
    return serialize_order(order, include_history=True)


@router.post(
    "/assignments/{assignment_id}/confirm",
    response_model=OrderAssignmentResponse,
    dependencies=[Depends(RoleChecker(["supplier", "admin"]))],
)
async def confirm_assignment_route(
    assignment_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = await confirm_assignment(session, assignment_id, current_user)
    detailed = await get_assignment_with_details(session, assignment.id)
    buyer = (
        detailed.order_item.order.buyer
        if detailed.order_item and detailed.order_item.order
        else None
    )
    return serialize_order_assignment(detailed, buyer)


@router.post(
    "/assignments/{assignment_id}/reject",
    response_model=OrderAssignmentResponse,
    dependencies=[Depends(RoleChecker(["supplier", "admin"]))],
)
async def reject_assignment_route(
    assignment_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = await reject_assignment(session, assignment_id, current_user)
    detailed = await get_assignment_with_details(session, assignment.id)
    buyer = (
        detailed.order_item.order.buyer
        if detailed.order_item and detailed.order_item.order
        else None
    )
    return serialize_order_assignment(detailed, buyer)


@router.post(
    "/items/{item_id}/assign",
    response_model=OrderAssignmentResponse,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def assign_item_supplier_route(
    item_id: int,
    payload: OrderAssignmentCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assignment = await assign_supplier_to_item(
        session,
        order_item_id=item_id,
        supplier_id=payload.supplier_id,
        catalog_id=payload.catalog_id,
        price=payload.price,
        score=payload.score,
        changed_by=current_user.id,
    )
    detailed = await get_assignment_with_details(session, assignment.id)
    buyer = (
        detailed.order_item.order.buyer
        if detailed.order_item and detailed.order_item.order
        else None
    )
    return serialize_order_assignment(detailed, buyer)


@router.get(
    "/{order_id}/history",
    response_model=List[OrderHistoryEntry],
    dependencies=[Depends(RoleChecker(["buyer", "supplier", "admin"]))],
)
async def list_order_history_route(
    order_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    order = await get_order_with_details(session, order_id)
    serialized = serialize_order(order, include_history=False)

    supplier_id: Optional[int] = None
    if current_user.role == "supplier":
        supplier = await _supplier_profile_for_user(session, current_user.id)
        supplier_id = supplier.id

    _ensure_order_access(serialized, current_user, supplier_id=supplier_id)
    return await get_order_history(session, order_id)
