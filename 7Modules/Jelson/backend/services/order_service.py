from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.events.bus import emit_event
from backend.models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.schemas.orders import OrderCreateRequest


STATUS_EVENT_MAP = {
    "CONFIRMED": "ORDER_CONFIRMED",
    "DISPATCHED": "ORDER_DISPATCHED",
    "IN_TRANSIT": "ORDER_IN_TRANSIT",
    "DELIVERED": "ORDER_DELIVERED",
    "CANCELLED": "ORDER_CANCELLED",
}


async def _get_buyer_profile(current_user: User, db: AsyncSession) -> BuyerProfile:
    result = await db.execute(select(BuyerProfile).where(BuyerProfile.user_id == current_user.id))
    buyer_profile = result.scalar_one_or_none()
    if buyer_profile is None:
        raise ValueError("Buyer profile not found")
    return buyer_profile


async def create_order(*, db: AsyncSession, current_user: User, payload: OrderCreateRequest) -> Order:
    if current_user.role != "buyer":
        raise PermissionError("Only buyers can place orders")

    buyer_profile = await _get_buyer_profile(current_user, db)

    order = Order(
        buyer_id=buyer_profile.id,
        status="PLACED",
        urgency=payload.urgency,
        required_delivery_date=payload.required_delivery_date,
    )
    db.add(order)
    await db.flush()

    for item in payload.items:
        db.add(
            OrderItem(
                order_id=order.id,
                category_id=item.category_id,
                part_number=item.part_number,
                part_description=item.part_description,
                quantity=item.quantity,
                status="PENDING",
            )
        )

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=None,
            to_status="PLACED",
            changed_by=current_user.id,
        )
    )
    await db.commit()
    await db.refresh(order)

    await emit_event(
        "ORDER_PLACED",
        {
            "order_id": order.id,
            "entity_type": "order",
            "entity_id": order.id,
            "buyer_id": buyer_profile.id,
            "buyer_user_id": current_user.id,
            "factory_name": buyer_profile.factory_name,
            "parts_count": len(payload.items),
        },
        [current_user.id],
    )
    return order


async def list_orders_for_user(*, db: AsyncSession, current_user: User) -> list[Order]:
    if current_user.role == "admin":
        result = await db.execute(select(Order).order_by(Order.created_at.desc(), Order.id.desc()))
        return result.scalars().all()

    if current_user.role == "buyer":
        buyer_profile = await _get_buyer_profile(current_user, db)
        result = await db.execute(
            select(Order).where(Order.buyer_id == buyer_profile.id).order_by(Order.created_at.desc(), Order.id.desc())
        )
        return result.scalars().all()

    supplier_profile_result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == current_user.id))
    supplier_profile = supplier_profile_result.scalar_one_or_none()
    if supplier_profile is None:
        return []

    result = await db.execute(
        select(Order)
        .join(OrderItem, OrderItem.order_id == Order.id)
        .join(OrderAssignment, OrderAssignment.order_item_id == OrderItem.id)
        .where(OrderAssignment.supplier_id == supplier_profile.id)
        .order_by(Order.created_at.desc(), Order.id.desc())
    )
    return result.scalars().unique().all()


async def _is_supplier_assigned_to_order(*, db: AsyncSession, user_id: int, order_id: int) -> bool:
    supplier_profile_result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == user_id))
    supplier_profile = supplier_profile_result.scalar_one_or_none()
    if supplier_profile is None:
        return False

    result = await db.execute(
        select(OrderAssignment.id)
        .join(OrderItem, OrderAssignment.order_item_id == OrderItem.id)
        .where(OrderItem.order_id == order_id, OrderAssignment.supplier_id == supplier_profile.id)
    )
    return result.first() is not None


async def update_order_status(
    *,
    db: AsyncSession,
    current_user: User,
    order_id: int,
    new_status: str,
) -> Order:
    order_result = await db.execute(select(Order).where(Order.id == order_id))
    order = order_result.scalar_one_or_none()
    if order is None:
        raise ValueError("Order not found")

    if current_user.role == "buyer":
        buyer_profile = await _get_buyer_profile(current_user, db)
        if order.buyer_id != buyer_profile.id or new_status != "CANCELLED":
            raise PermissionError("Buyers can only cancel their own orders")
    elif current_user.role == "supplier":
        assigned = await _is_supplier_assigned_to_order(db=db, user_id=current_user.id, order_id=order_id)
        if not assigned:
            raise PermissionError("Supplier is not assigned to this order")

    previous_status = order.status
    order.status = new_status
    order.updated_at = datetime.utcnow()

    db.add(
        OrderStatusHistory(
            order_id=order.id,
            from_status=previous_status,
            to_status=new_status,
            changed_by=current_user.id,
        )
    )
    await db.commit()
    await db.refresh(order)

    event_type = STATUS_EVENT_MAP.get(new_status)
    if event_type is not None:
        buyer_profile_result = await db.execute(select(BuyerProfile).where(BuyerProfile.id == order.buyer_id))
        buyer_profile = buyer_profile_result.scalar_one_or_none()
        supplier_result = await db.execute(
            select(SupplierProfile.user_id)
            .join(OrderAssignment, OrderAssignment.supplier_id == SupplierProfile.id)
            .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
            .where(OrderItem.order_id == order.id)
        )
        supplier_user_ids = [int(row[0]) for row in supplier_result.all() if row[0] is not None]
        buyer_user_id = int(buyer_profile.user_id) if buyer_profile is not None else None
        targets = [uid for uid in [buyer_user_id, *supplier_user_ids] if uid is not None]
        await emit_event(
            event_type,
            {
                "order_id": order.id,
                "entity_type": "order",
                "entity_id": order.id,
                "buyer_id": order.buyer_id,
                "buyer_user_id": buyer_user_id,
            },
            targets,
        )

    return order


async def update_assignment_status(
    *,
    db: AsyncSession,
    current_user: User,
    assignment_id: int,
    new_status: str,
) -> OrderAssignment:
    assignment_result = await db.execute(select(OrderAssignment).where(OrderAssignment.id == assignment_id))
    assignment = assignment_result.scalar_one_or_none()
    if assignment is None:
        raise ValueError("Assignment not found")

    supplier_result = await db.execute(select(SupplierProfile).where(SupplierProfile.id == assignment.supplier_id))
    supplier_profile = supplier_result.scalar_one_or_none()
    if supplier_profile is None:
        raise ValueError("Supplier profile not found")

    if current_user.role == "supplier" and supplier_profile.user_id != current_user.id:
        raise PermissionError("Cannot update another supplier assignment")

    assignment.status = new_status
    await db.flush()

    order_item_result = await db.execute(select(OrderItem).where(OrderItem.id == assignment.order_item_id))
    order_item = order_item_result.scalar_one_or_none()
    if order_item is None:
        raise ValueError("Order item not found")

    order_result = await db.execute(select(Order).where(Order.id == order_item.order_id))
    order = order_result.scalar_one_or_none()
    if order is None:
        raise ValueError("Order not found")

    buyer_profile_result = await db.execute(select(BuyerProfile).where(BuyerProfile.id == order.buyer_id))
    buyer_profile = buyer_profile_result.scalar_one_or_none()
    buyer_user_id = int(buyer_profile.user_id) if buyer_profile is not None else None
    supplier_user_id = int(supplier_profile.user_id)

    if new_status == "ACCEPTED":
        order_item.status = "CONFIRMED"
        order.status = "CONFIRMED"
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                order_item_id=order_item.id,
                from_status="MATCHED",
                to_status="CONFIRMED",
                changed_by=current_user.id,
            )
        )
    elif new_status == "FULFILLED":
        order_item.status = "DELIVERED"
        order.status = "DELIVERED"
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                order_item_id=order_item.id,
                from_status="IN_TRANSIT",
                to_status="DELIVERED",
                changed_by=current_user.id,
            )
        )
    elif new_status == "REJECTED":
        order_item.status = "CANCELLED"
        order.status = "CANCELLED"
        db.add(
            OrderStatusHistory(
                order_id=order.id,
                order_item_id=order_item.id,
                from_status="MATCHED",
                to_status="CANCELLED",
                changed_by=current_user.id,
            )
        )

    await db.commit()
    await db.refresh(assignment)

    if new_status == "ACCEPTED":
        await emit_event(
            "ORDER_CONFIRMED",
            {
                "order_id": order.id,
                "order_item_id": order_item.id,
                "order_assignment_id": assignment.id,
                "entity_type": "order",
                "entity_id": order.id,
                "buyer_id": order.buyer_id,
                "buyer_user_id": buyer_user_id,
                "supplier_id": supplier_profile.id,
                "supplier_user_id": supplier_user_id,
                "supplier_name": supplier_profile.business_name,
            },
            [uid for uid in [buyer_user_id, supplier_user_id] if uid is not None],
        )
    elif new_status == "FULFILLED":
        await emit_event(
            "ORDER_DELIVERED",
            {
                "order_id": order.id,
                "order_item_id": order_item.id,
                "order_assignment_id": assignment.id,
                "entity_type": "order",
                "entity_id": order.id,
                "buyer_id": order.buyer_id,
                "buyer_user_id": buyer_user_id,
                "supplier_id": supplier_profile.id,
                "supplier_user_id": supplier_user_id,
            },
            [uid for uid in [buyer_user_id, supplier_user_id] if uid is not None],
        )
    elif new_status == "REJECTED":
        await emit_event(
            "ORDER_CANCELLED",
            {
                "order_id": order.id,
                "order_item_id": order_item.id,
                "order_assignment_id": assignment.id,
                "entity_type": "order",
                "entity_id": order.id,
                "supplier_id": supplier_profile.id,
                "supplier_user_id": supplier_user_id,
                "buyer_id": order.buyer_id,
                "buyer_user_id": buyer_user_id,
            },
            [uid for uid in [buyer_user_id, supplier_user_id] if uid is not None],
        )

    return assignment
