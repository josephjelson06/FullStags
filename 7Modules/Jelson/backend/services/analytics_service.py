from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta

from sqlalchemy import and_, case, desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.models.catalog import PartCategory, PartsCatalog
from backend.models.delivery import Delivery
from backend.models.matching import MatchingLog
from backend.models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from backend.models.user import BuyerProfile, SupplierProfile
from backend.schemas.analytics import (
    AnalyticsKpisResponse,
    BuyerGeoPoint,
    CategoryDemandPoint,
    DemandAnalyticsResponse,
    GeoAnalyticsResponse,
    OrdersOverTimePoint,
    RegionDemandPoint,
    RouteAnalyticsResponse,
    RouteComparisonPoint,
    RouteDistanceTrendPoint,
    SupplierGeoPoint,
    SupplierPerformancePoint,
    SuppliersAnalyticsResponse,
)


def _to_float(value: object | None) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _seconds_diff_expr(start_col, end_col, dialect_name: str):
    if dialect_name == "sqlite":
        return (func.julianday(end_col) - func.julianday(start_col)) * 86400.0
    return func.extract("epoch", end_col - start_col)


def _region_bucket_expr():
    return case(
        (
            and_(
                BuyerProfile.latitude.between(18.7, 19.4),
                BuyerProfile.longitude.between(72.6, 73.2),
            ),
            "Mumbai",
        ),
        (
            and_(
                BuyerProfile.latitude.between(18.3, 18.9),
                BuyerProfile.longitude.between(73.5, 74.2),
            ),
            "Pune",
        ),
        (
            and_(
                BuyerProfile.latitude.between(12.7, 13.4),
                BuyerProfile.longitude.between(80.1, 80.5),
            ),
            "Chennai",
        ),
        else_="Other",
    )


def _stock_band(total_stock: int) -> str:
    if total_stock > 1000:
        return "high"
    if total_stock >= 200:
        return "medium"
    return "low"


async def get_kpis(db: AsyncSession) -> AnalyticsKpisResponse:
    bind = db.get_bind()
    dialect_name = bind.dialect.name if bind is not None else "sqlite"

    total_orders = int(
        (await db.scalar(select(func.count(Order.id)))) or 0,
    )
    non_cancelled_orders = int(
        (await db.scalar(select(func.count(Order.id)).where(Order.status != "CANCELLED"))) or 0,
    )
    delivered_orders = int(
        (await db.scalar(select(func.count(Order.id)).where(Order.status == "DELIVERED"))) or 0,
    )

    fulfillment_rate = 0.0
    if non_cancelled_orders > 0:
        fulfillment_rate = (delivered_orders / non_cancelled_orders) * 100.0

    first_match_subquery = (
        select(
            OrderItem.order_id.label("order_id"),
            func.min(MatchingLog.created_at).label("first_match_at"),
        )
        .join(MatchingLog, MatchingLog.order_item_id == OrderItem.id)
        .group_by(OrderItem.order_id)
        .subquery()
    )

    avg_matching_time_seconds = _to_float(
        await db.scalar(
            select(
                func.avg(
                    _seconds_diff_expr(Order.created_at, first_match_subquery.c.first_match_at, dialect_name),
                ),
            ).join(first_match_subquery, first_match_subquery.c.order_id == Order.id),
        ),
    )

    avg_delivery_eta_minutes = _to_float(
        await db.scalar(
            select(func.avg(Delivery.total_duration_minutes)).where(Delivery.total_duration_minutes.is_not(None)),
        ),
    )

    route_efficiency_expr = (
        ((Delivery.naive_distance_km - Delivery.optimized_distance_km) / func.nullif(Delivery.naive_distance_km, 0))
        * 100.0
    )
    route_efficiency_percent = _to_float(
        await db.scalar(
            select(func.avg(route_efficiency_expr)).where(
                Delivery.delivery_type == "batched",
                Delivery.naive_distance_km.is_not(None),
                Delivery.optimized_distance_km.is_not(None),
                Delivery.naive_distance_km > 0,
            ),
        ),
    )

    return AnalyticsKpisResponse(
        total_orders=total_orders,
        fulfillment_rate_percent=round(fulfillment_rate, 2),
        avg_matching_time_seconds=round(avg_matching_time_seconds, 2) if avg_matching_time_seconds is not None else None,
        avg_delivery_eta_minutes=round(avg_delivery_eta_minutes, 2) if avg_delivery_eta_minutes is not None else None,
        route_efficiency_percent=round(route_efficiency_percent, 2) if route_efficiency_percent is not None else None,
    )


async def get_demand_analytics(db: AsyncSession) -> DemandAnalyticsResponse:
    top_categories_result = await db.execute(
        select(
            PartCategory.id.label("category_id"),
            PartCategory.name.label("name"),
            PartCategory.subcategory.label("subcategory"),
            func.count(OrderItem.id).label("order_count"),
        )
        .join(OrderItem, OrderItem.category_id == PartCategory.id)
        .group_by(PartCategory.id, PartCategory.name, PartCategory.subcategory)
        .order_by(desc("order_count"))
        .limit(10),
    )

    top_categories: list[CategoryDemandPoint] = []
    for row in top_categories_result.all():
        category_name = str(row.name)
        if row.subcategory:
            category_name = f"{category_name} - {row.subcategory}"
        top_categories.append(
            CategoryDemandPoint(
                category_id=int(row.category_id),
                category_name=category_name,
                order_count=int(row.order_count),
            ),
        )

    start_dt = datetime.utcnow() - timedelta(days=29)
    date_expr = func.date(Order.created_at)
    orders_by_date_result = await db.execute(
        select(
            date_expr.label("order_date"),
            func.count(Order.id).label("order_count"),
        )
        .where(Order.created_at >= start_dt)
        .group_by(date_expr)
        .order_by(date_expr.asc()),
    )
    date_counts: dict[str, int] = defaultdict(int)
    for row in orders_by_date_result.all():
        date_counts[str(row.order_date)] = int(row.order_count)

    orders_over_time: list[OrdersOverTimePoint] = []
    for idx in range(30):
        date_value = (start_dt.date() + timedelta(days=idx)).isoformat()
        orders_over_time.append(
            OrdersOverTimePoint(
                date=date_value,
                order_count=date_counts.get(date_value, 0),
            ),
        )

    region_expr = _region_bucket_expr()
    region_result = await db.execute(
        select(
            region_expr.label("region"),
            func.count(Order.id).label("order_count"),
        )
        .join(BuyerProfile, BuyerProfile.id == Order.buyer_id)
        .group_by(region_expr)
        .order_by(desc("order_count")),
    )

    orders_by_region = [
        RegionDemandPoint(region=str(row.region), order_count=int(row.order_count))
        for row in region_result.all()
    ]

    return DemandAnalyticsResponse(
        top_categories=top_categories,
        orders_over_time=orders_over_time,
        orders_by_region=orders_by_region,
    )


async def get_route_analytics(db: AsyncSession) -> RouteAnalyticsResponse:
    total_km_saved = _to_float(
        await db.scalar(
            select(func.sum(Delivery.naive_distance_km - Delivery.optimized_distance_km)).where(
                Delivery.delivery_type == "batched",
                Delivery.naive_distance_km.is_not(None),
                Delivery.optimized_distance_km.is_not(None),
            ),
        ),
    )

    percent_saved_expr = (
        ((Delivery.naive_distance_km - Delivery.optimized_distance_km) / func.nullif(Delivery.naive_distance_km, 0))
        * 100.0
    )

    batched_result = await db.execute(
        select(
            Delivery.id,
            Delivery.created_at,
            Delivery.naive_distance_km,
            Delivery.optimized_distance_km,
            (Delivery.naive_distance_km - Delivery.optimized_distance_km).label("km_saved"),
            percent_saved_expr.label("percent_saved"),
        )
        .where(
            Delivery.delivery_type == "batched",
            Delivery.naive_distance_km.is_not(None),
            Delivery.optimized_distance_km.is_not(None),
            Delivery.naive_distance_km > 0,
        )
        .order_by(Delivery.created_at.desc(), Delivery.id.desc()),
    )
    batched_deliveries = [
        RouteComparisonPoint(
            delivery_id=int(row.id),
            created_at=row.created_at,
            naive_distance_km=float(row.naive_distance_km),
            optimized_distance_km=float(row.optimized_distance_km),
            km_saved=round(float(row.km_saved), 2),
            percent_saved=round(float(row.percent_saved), 2),
        )
        for row in batched_result.all()
    ]

    distance_date_expr = func.date(Delivery.created_at)
    distance_result = await db.execute(
        select(
            distance_date_expr.label("delivery_date"),
            func.avg(Delivery.total_distance_km).label("avg_distance_km"),
            func.count(Delivery.id).label("delivery_count"),
        )
        .where(Delivery.total_distance_km.is_not(None))
        .group_by(distance_date_expr)
        .order_by(distance_date_expr.asc()),
    )
    avg_distance_over_time = [
        RouteDistanceTrendPoint(
            date=str(row.delivery_date),
            avg_distance_km=round(float(row.avg_distance_km), 2),
            delivery_count=int(row.delivery_count),
        )
        for row in distance_result.all()
    ]

    return RouteAnalyticsResponse(
        total_km_saved=round(total_km_saved or 0.0, 2),
        batched_deliveries=batched_deliveries,
        avg_distance_over_time=avg_distance_over_time,
    )


async def get_supplier_analytics(db: AsyncSession) -> SuppliersAnalyticsResponse:
    bind = db.get_bind()
    dialect_name = bind.dialect.name if bind is not None else "sqlite"

    fulfilled_subquery = (
        select(
            OrderAssignment.supplier_id.label("supplier_id"),
            func.count(OrderAssignment.id).label("orders_fulfilled"),
        )
        .where(OrderAssignment.status == "FULFILLED")
        .group_by(OrderAssignment.supplier_id)
        .subquery()
    )

    revenue_subquery = (
        select(
            OrderAssignment.supplier_id.label("supplier_id"),
            func.sum(OrderAssignment.assigned_price * OrderItem.quantity).label("revenue"),
        )
        .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
        .where(OrderAssignment.status.in_(["ACCEPTED", "FULFILLED"]))
        .group_by(OrderAssignment.supplier_id)
        .subquery()
    )

    first_dispatch_subquery = (
        select(
            OrderStatusHistory.order_id.label("order_id"),
            func.min(OrderStatusHistory.created_at).label("dispatch_at"),
        )
        .where(OrderStatusHistory.to_status == "DISPATCHED")
        .group_by(OrderStatusHistory.order_id)
        .subquery()
    )

    dispatch_seconds_subquery = (
        select(
            OrderAssignment.supplier_id.label("supplier_id"),
            func.avg(
                _seconds_diff_expr(Order.created_at, first_dispatch_subquery.c.dispatch_at, dialect_name),
            ).label("avg_dispatch_time_seconds"),
        )
        .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
        .join(Order, Order.id == OrderItem.order_id)
        .join(first_dispatch_subquery, first_dispatch_subquery.c.order_id == Order.id)
        .where(OrderAssignment.status.in_(["ACCEPTED", "FULFILLED"]))
        .group_by(OrderAssignment.supplier_id)
        .subquery()
    )

    supplier_result = await db.execute(
        select(
            SupplierProfile.id.label("supplier_id"),
            SupplierProfile.user_id.label("supplier_user_id"),
            SupplierProfile.business_name.label("supplier_name"),
            func.coalesce(fulfilled_subquery.c.orders_fulfilled, 0).label("orders_fulfilled"),
            dispatch_seconds_subquery.c.avg_dispatch_time_seconds.label("avg_dispatch_time_seconds"),
            SupplierProfile.reliability_score.label("reliability_score"),
            func.coalesce(revenue_subquery.c.revenue, 0.0).label("revenue"),
        )
        .outerjoin(fulfilled_subquery, fulfilled_subquery.c.supplier_id == SupplierProfile.id)
        .outerjoin(revenue_subquery, revenue_subquery.c.supplier_id == SupplierProfile.id)
        .outerjoin(dispatch_seconds_subquery, dispatch_seconds_subquery.c.supplier_id == SupplierProfile.id)
        .order_by(desc("orders_fulfilled"), SupplierProfile.business_name.asc()),
    )

    suppliers = [
        SupplierPerformancePoint(
            supplier_id=int(row.supplier_id),
            supplier_user_id=int(row.supplier_user_id),
            supplier_name=str(row.supplier_name),
            orders_fulfilled=int(row.orders_fulfilled),
            avg_dispatch_time_seconds=(
                round(float(row.avg_dispatch_time_seconds), 2)
                if row.avg_dispatch_time_seconds is not None
                else None
            ),
            reliability_score=float(row.reliability_score) if row.reliability_score is not None else None,
            revenue=round(float(row.revenue), 2),
        )
        for row in supplier_result.all()
    ]

    return SuppliersAnalyticsResponse(suppliers=suppliers)


async def get_geo_analytics(db: AsyncSession) -> GeoAnalyticsResponse:
    stock_subquery = (
        select(
            PartsCatalog.supplier_id.label("supplier_id"),
            func.sum(PartsCatalog.quantity_in_stock).label("total_stock"),
        )
        .group_by(PartsCatalog.supplier_id)
        .subquery()
    )

    supplier_result = await db.execute(
        select(
            SupplierProfile.id.label("supplier_id"),
            SupplierProfile.business_name.label("supplier_name"),
            SupplierProfile.latitude,
            SupplierProfile.longitude,
            func.coalesce(stock_subquery.c.total_stock, 0).label("total_stock"),
        )
        .outerjoin(stock_subquery, stock_subquery.c.supplier_id == SupplierProfile.id)
        .order_by(SupplierProfile.business_name.asc()),
    )
    suppliers = [
        SupplierGeoPoint(
            supplier_id=int(row.supplier_id),
            supplier_name=str(row.supplier_name),
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            total_stock=int(row.total_stock),
            stock_band=_stock_band(int(row.total_stock)),
        )
        for row in supplier_result.all()
    ]

    region_expr = _region_bucket_expr()
    buyer_result = await db.execute(
        select(
            BuyerProfile.id.label("buyer_id"),
            BuyerProfile.factory_name.label("buyer_name"),
            BuyerProfile.latitude,
            BuyerProfile.longitude,
            region_expr.label("region"),
            func.count(Order.id).label("order_count"),
        )
        .outerjoin(Order, Order.buyer_id == BuyerProfile.id)
        .group_by(
            BuyerProfile.id,
            BuyerProfile.factory_name,
            BuyerProfile.latitude,
            BuyerProfile.longitude,
            region_expr,
        )
        .order_by(BuyerProfile.factory_name.asc()),
    )
    buyers = [
        BuyerGeoPoint(
            buyer_id=int(row.buyer_id),
            buyer_name=str(row.buyer_name),
            latitude=float(row.latitude),
            longitude=float(row.longitude),
            order_count=int(row.order_count),
            region=str(row.region),
        )
        for row in buyer_result.all()
    ]

    return GeoAnalyticsResponse(suppliers=suppliers, buyers=buyers)
