from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.delivery import Delivery, DeliveryStop
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.schemas.deliveries import BatchDeliveryRequest, DeliveryResponse, DeliveryStatusUpdateRequest
from backend.services.routing_service import complete_delivery, create_batched_delivery, create_single_delivery

router = APIRouter(prefix="/api/deliveries", tags=["deliveries"])


@router.get("/", response_model=list[DeliveryResponse])
async def list_deliveries(
    limit: int = Query(default=100, ge=1, le=300),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(Delivery).order_by(Delivery.created_at.desc(), Delivery.id.desc()).limit(limit)
    if current_user.role == "buyer":
        buyer_profile_result = await db.execute(select(BuyerProfile).where(BuyerProfile.user_id == current_user.id))
        buyer_profile = buyer_profile_result.scalar_one_or_none()
        if buyer_profile is None:
            return []

        result = await db.execute(
            select(Delivery)
            .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
            .join(OrderAssignment, DeliveryStop.order_assignment_id == OrderAssignment.id)
            .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.buyer_id == buyer_profile.id)
            .order_by(Delivery.created_at.desc(), Delivery.id.desc())
            .limit(limit)
        )
        return result.scalars().unique().all()

    if current_user.role == "supplier":
        supplier_result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == current_user.id))
        supplier_profile = supplier_result.scalar_one_or_none()
        if supplier_profile is None:
            return []
        result = await db.execute(
            select(Delivery)
            .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
            .join(OrderAssignment, DeliveryStop.order_assignment_id == OrderAssignment.id)
            .where(OrderAssignment.supplier_id == supplier_profile.id)
            .order_by(Delivery.created_at.desc(), Delivery.id.desc())
            .limit(limit)
        )
        return result.scalars().unique().all()

    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/single/{assignment_id}",
    response_model=DeliveryResponse,
    dependencies=[Depends(RoleChecker(["admin", "supplier"]))],
)
async def create_single_delivery_route(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role == "supplier":
        supplier_result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == current_user.id))
        supplier_profile = supplier_result.scalar_one_or_none()
        assignment_result = await db.execute(select(OrderAssignment).where(OrderAssignment.id == assignment_id))
        assignment = assignment_result.scalar_one_or_none()
        if supplier_profile is None or assignment is None or assignment.supplier_id != supplier_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    try:
        delivery = await create_single_delivery(assignment_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return delivery


@router.post(
    "/batch/optimize",
    response_model=DeliveryResponse,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def optimize_batch_delivery(payload: BatchDeliveryRequest, db: AsyncSession = Depends(get_db)):
    try:
        delivery = await create_batched_delivery(payload.assignment_ids, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return delivery


@router.patch("/{delivery_id}/status", response_model=DeliveryResponse)
async def update_delivery_status(
    delivery_id: int,
    payload: DeliveryStatusUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"admin", "supplier"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    result = await db.execute(select(Delivery).where(Delivery.id == delivery_id))
    delivery = result.scalar_one_or_none()
    if delivery is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Delivery not found")

    delivery.status = payload.status
    await db.commit()
    await db.refresh(delivery)

    if payload.status == "COMPLETED":
        await complete_delivery(delivery, db)
        await db.refresh(delivery)

    return delivery
