from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_async_session
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.order import (
    Order,
    OrderAssignment,
    OrderItem,
    OrderStatusHistory,
)
from backend.models.users import BuyerProfile, SupplierProfile
from backend.models.inventory import PartCategory, PartsCatalog

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


# -------------------- Buyer analytics -------------------- #


@router.get(
    "/buyer/summary",
    dependencies=[Depends(RoleChecker(["buyer"]))],
)
async def buyer_summary(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    buyer = await _buyer_profile(session, int(current_user["user_id"]))

    active_statuses = ["PLACED", "MATCHED", "CONFIRMED", "DISPATCHED", "IN_TRANSIT"]
    active_orders_q = select(func.count(Order.id)).where(
        Order.buyer_id == buyer.id, Order.status.in_(active_statuses)
    )
    pending_delivery_q = select(func.count(Order.id)).where(
        Order.buyer_id == buyer.id, Order.status.in_(["DISPATCHED", "IN_TRANSIT"])
    )

    delivered = (
        select(
            OrderItem.id,
            OrderItem.quantity,
            OrderAssignment.assigned_price,
            Order.created_at,
            Order.updated_at,
        )
        .join(Order, Order.id == OrderItem.order_id)
        .join(
            OrderAssignment,
            OrderAssignment.order_item_id == OrderItem.id,
        )
        .where(Order.buyer_id == buyer.id)
        .where(Order.status == "DELIVERED")
        .where(OrderAssignment.status.in_(["ACCEPTED", "FULFILLED"]))
    )
    delivered_rows = (await session.execute(delivered)).all()

    total_spend = 0.0
    delivery_durations: List[float] = []
    for row in delivered_rows:
        qty = row.quantity or 0
        price = row.assigned_price or 0
        total_spend += qty * float(price)
        if row.created_at and row.updated_at:
            delta = row.updated_at - row.created_at
            delivery_durations.append(delta.total_seconds() / 3600.0)

    avg_delivery_hours = round(sum(delivery_durations) / len(delivery_durations), 2) if delivery_durations else 0.0

    active_orders = (await session.execute(active_orders_q)).scalar_one()
    pending_deliveries = (await session.execute(pending_delivery_q)).scalar_one()

    return {
        "active_orders": active_orders,
        "pending_deliveries": pending_deliveries,
        "avg_delivery_hours": avg_delivery_hours,
        "total_spend": round(total_spend, 2),
    }


@router.get(
    "/buyer/order-map-data",
    dependencies=[Depends(RoleChecker(["buyer"]))],
)
async def buyer_order_map_data(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    buyer = await _buyer_profile(session, int(current_user["user_id"]))

    active_orders_stmt = (
        select(Order)
        .where(
            Order.buyer_id == buyer.id,
            Order.status.in_(["DISPATCHED", "IN_TRANSIT"]),
        )
    )
    orders = (await session.execute(active_orders_stmt)).scalars().all()

    features: List[Dict[str, Any]] = []
    for order in orders:
        # Fallback geometry: straight line from buyer to each supplier assignment centroid
        items = (
            await session.execute(
                select(
                    OrderItem.id,
                    OrderItem.quantity,
                    SupplierProfile.latitude,
                    SupplierProfile.longitude,
                    SupplierProfile.business_name,
                )
                .join(OrderAssignment, OrderAssignment.order_item_id == OrderItem.id)
                .join(SupplierProfile, SupplierProfile.id == OrderAssignment.supplier_id)
                .where(OrderItem.order_id == order.id)
            )
        ).all()
        supplier_points = [
            (row.latitude, row.longitude, row.business_name) for row in items if row.latitude and row.longitude
        ]
        if not supplier_points or buyer.latitude is None or buyer.longitude is None:
            continue
        for lat, lng, name in supplier_points:
            geometry = [
                [buyer.latitude, buyer.longitude],
                [lat, lng],
            ]
            features.append(
                {
                    "order_id": order.id,
                    "status": order.status,
                    "eta": order.updated_at,
                    "buyer": {"lat": buyer.latitude, "lng": buyer.longitude},
                    "supplier": {"lat": lat, "lng": lng, "name": name},
                    "geometry": geometry,
                }
            )

    return {"routes": features}


# -------------------- Supplier analytics -------------------- #


@router.get(
    "/supplier/summary",
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def supplier_summary(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    supplier = await _supplier_profile(session, int(current_user["user_id"]))
    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    delivered_items_stmt = (
        select(
            OrderItem.id,
            OrderItem.quantity,
            OrderAssignment.assigned_price,
            OrderStatusHistory.created_at,
            OrderStatusHistory.to_status,
        )
        .join(OrderAssignment, OrderAssignment.order_item_id == OrderItem.id)
        .join(
            OrderStatusHistory,
            and_(
                OrderStatusHistory.order_item_id == OrderItem.id,
                OrderStatusHistory.to_status.in_(["CONFIRMED", "DISPATCHED", "DELIVERED"]),
            ),
        )
        .where(OrderAssignment.supplier_id == supplier.id)
    )
    rows = (await session.execute(delivered_items_stmt)).all()

    revenue_month = 0.0
    dispatched_times: List[float] = []
    orders_fulfilled = 0

    # Track earliest confirmed and dispatched timestamps per item
    confirmed_map: Dict[int, datetime] = {}
    dispatched_map: Dict[int, datetime] = {}

    for row in rows:
        if row.to_status == "DISPATCHED":
            dispatched_map[row.id] = min(
                dispatched_map.get(row.id, row.created_at), row.created_at
            )
        if row.to_status == "CONFIRMED":
            confirmed_map[row.id] = min(
                confirmed_map.get(row.id, row.created_at), row.created_at
            )
        if row.to_status == "DELIVERED":
            orders_fulfilled += 1
            if row.created_at and row.created_at >= month_start:
                price = row.assigned_price or 0
                qty = row.quantity or 0
                revenue_month += qty * float(price)

    for item_id, dispatched_at in dispatched_map.items():
        confirmed_at = confirmed_map.get(item_id)
        if confirmed_at and dispatched_at:
            dispatched_times.append((dispatched_at - confirmed_at).total_seconds() / 3600.0)

    avg_dispatch_hours = round(sum(dispatched_times) / len(dispatched_times), 2) if dispatched_times else 0.0

    reliability_pct = round((supplier.reliability_score or 0) * 100, 1)

    return {
        "reliability_pct": reliability_pct,
        "orders_fulfilled_month": orders_fulfilled,
        "avg_dispatch_hours": avg_dispatch_hours,
        "revenue_month": round(revenue_month, 2),
    }


@router.get(
    "/supplier/inventory-stats",
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def supplier_inventory_stats(
    session: AsyncSession = Depends(get_async_session),
    current_user: dict = Depends(get_current_user),
) -> Dict[str, Any]:
    supplier = await _supplier_profile(session, int(current_user["user_id"]))

    agg_stmt = (
        select(
            PartCategory.name,
            func.sum(PartsCatalog.quantity_in_stock).label("qty"),
            func.sum(PartsCatalog.unit_price * PartsCatalog.quantity_in_stock).label("value"),
        )
        .join(PartCategory, PartCategory.id == PartsCatalog.category_id)
        .where(PartsCatalog.supplier_id == supplier.id)
        .group_by(PartCategory.name)
    )
    rows = (await session.execute(agg_stmt)).all()

    low_stock_stmt = (
        select(
            PartsCatalog.id,
            PartsCatalog.part_name,
            PartsCatalog.part_number,
            PartsCatalog.quantity_in_stock,
            PartsCatalog.min_order_quantity,
        )
        .where(PartsCatalog.supplier_id == supplier.id)
        .where(PartsCatalog.quantity_in_stock < PartsCatalog.min_order_quantity * 2)
        .order_by(PartsCatalog.quantity_in_stock.asc())
        .limit(10)
    )
    low_stock = (await session.execute(low_stock_stmt)).all()

    total_value = sum(row.value or 0 for row in rows)

    return {
        "category_breakdown": [
            {"category": row.name, "quantity": int(row.qty or 0), "value": float(row.value or 0)}
            for row in rows
        ],
        "low_stock": [
            {
                "id": r.id,
                "part_name": r.part_name,
                "part_number": r.part_number,
                "quantity_in_stock": r.quantity_in_stock,
                "min_order_quantity": r.min_order_quantity,
            }
            for r in low_stock
        ],
        "total_catalog_value": round(float(total_value), 2),
    }


# -------------------- helpers -------------------- #


async def _buyer_profile(session: AsyncSession, user_id: int) -> BuyerProfile:
    result = await session.execute(select(BuyerProfile).where(BuyerProfile.user_id == user_id))
    buyer = result.scalar_one_or_none()
    if not buyer:
        raise HTTPException(status_code=404, detail="Buyer profile not found")
    return buyer


async def _supplier_profile(session: AsyncSession, user_id: int) -> SupplierProfile:
    result = await session.execute(select(SupplierProfile).where(SupplierProfile.user_id == user_id))
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    return supplier
