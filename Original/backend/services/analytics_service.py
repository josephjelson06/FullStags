from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Dict, List

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.delivery import Delivery
from ..models.inventory import PartsCatalog
from ..models.matching import MatchingLog
from ..models.notifications import EventLog
from ..models.orders import Order, OrderAssignment, OrderItem
from ..models.users import SupplierProfile


def _float(value: object, default: float = 0.0) -> float:
    if value is None:
        return default
    return float(value)


def _int(value: object, default: int = 0) -> int:
    if value is None:
        return default
    return int(value)


async def get_order_status_distribution(session: AsyncSession) -> List[Dict]:
    rows = (
        await session.execute(
            select(Order.status, func.count(Order.id))
            .group_by(Order.status)
            .order_by(Order.status.asc())
        )
    ).all()
    return [{"status": status, "count": _int(count)} for status, count in rows]


async def get_matching_analytics(session: AsyncSession) -> Dict:
    per_item_subquery = (
        select(
            MatchingLog.order_item_id.label("order_item_id"),
            func.count(MatchingLog.id).label("candidate_count"),
        )
        .group_by(MatchingLog.order_item_id)
        .subquery()
    )
    item_count, avg_candidates = (
        await session.execute(
            select(
                func.count(per_item_subquery.c.order_item_id),
                func.avg(per_item_subquery.c.candidate_count),
            )
        )
    ).first()

    avg_top_score = (
        await session.execute(
            select(func.avg(MatchingLog.total_score)).where(MatchingLog.rank == 1)
        )
    ).scalar_one()

    avg_selected_score = (
        await session.execute(select(func.avg(OrderAssignment.match_score)))
    ).scalar_one()

    urgency_rows = (
        await session.execute(
            select(Order.urgency, func.avg(MatchingLog.total_score))
            .join(OrderItem, OrderItem.id == MatchingLog.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(MatchingLog.rank == 1)
            .group_by(Order.urgency)
            .order_by(Order.urgency.asc())
        )
    ).all()

    urgency_top_score = {urgency: _float(score) for urgency, score in urgency_rows}

    return {
        "total_items_scored": _int(item_count),
        "avg_candidates_per_item": _float(avg_candidates),
        "avg_top_score": _float(avg_top_score),
        "avg_selected_score": _float(avg_selected_score),
        "urgency_top_score": urgency_top_score,
    }


async def get_delivery_analytics(session: AsyncSession) -> Dict:
    totals = (
        await session.execute(
            select(
                func.count(Delivery.id),
                func.avg(Delivery.total_distance_km),
                func.avg(Delivery.total_duration_minutes),
                func.sum(func.coalesce(Delivery.naive_distance_km, 0.0)),
                func.sum(func.coalesce(Delivery.optimized_distance_km, 0.0)),
            )
        )
    ).first()

    status_rows = (
        await session.execute(
            select(Delivery.status, func.count(Delivery.id))
            .group_by(Delivery.status)
            .order_by(Delivery.status.asc())
        )
    ).all()
    status_map = {status: _int(count) for status, count in status_rows}

    total_naive = _float(totals[3])
    total_optimized = _float(totals[4])
    savings = max(0.0, total_naive - total_optimized)
    savings_percent = (savings / total_naive * 100.0) if total_naive > 0 else 0.0

    return {
        "total_deliveries": _int(totals[0]),
        "planned_deliveries": status_map.get("PLANNED", 0),
        "in_progress_deliveries": status_map.get("IN_PROGRESS", 0),
        "completed_deliveries": status_map.get("COMPLETED", 0),
        "avg_distance_km": _float(totals[1]),
        "avg_duration_minutes": _float(totals[2]),
        "total_naive_distance_km": total_naive,
        "total_optimized_distance_km": total_optimized,
        "total_savings_km": savings,
        "total_savings_percent": savings_percent,
    }


async def get_supplier_performance(session: AsyncSession) -> List[Dict]:
    fulfilled_case = case((OrderAssignment.status == "FULFILLED", 1), else_=0)
    rejected_case = case((OrderAssignment.status == "REJECTED", 1), else_=0)

    rows = (
        await session.execute(
            select(
                SupplierProfile.id,
                SupplierProfile.business_name,
                func.coalesce(SupplierProfile.reliability_score, 0.0),
                func.count(OrderAssignment.id),
                func.sum(fulfilled_case),
                func.sum(rejected_case),
                func.avg(func.coalesce(OrderAssignment.match_score, 0.0)),
            )
            .outerjoin(OrderAssignment, OrderAssignment.supplier_id == SupplierProfile.id)
            .group_by(SupplierProfile.id, SupplierProfile.business_name, SupplierProfile.reliability_score)
            .order_by(SupplierProfile.business_name.asc())
        )
    ).all()

    results: List[Dict] = []
    for supplier_id, name, reliability, total, fulfilled, rejected, avg_score in rows:
        total_assignments = _int(total)
        fulfilled_assignments = _int(fulfilled)
        rejected_assignments = _int(rejected)
        fulfillment_rate = (
            (fulfilled_assignments / total_assignments) if total_assignments else 0.0
        )
        results.append(
            {
                "supplier_id": _int(supplier_id),
                "supplier_name": name,
                "reliability_score": _float(reliability),
                "assignments_total": total_assignments,
                "fulfilled_assignments": fulfilled_assignments,
                "rejected_assignments": rejected_assignments,
                "fulfillment_rate": fulfillment_rate,
                "avg_match_score": _float(avg_score),
            }
        )
    return results


async def get_low_stock_items(session: AsyncSession, limit: int = 20, threshold: int = 5) -> List[Dict]:
    reorder_expr = func.max(func.coalesce(PartsCatalog.min_order_quantity, 1) * 2, threshold)
    rows = (
        await session.execute(
            select(
                PartsCatalog.id,
                SupplierProfile.id,
                SupplierProfile.business_name,
                PartsCatalog.part_number,
                PartsCatalog.part_name,
                PartsCatalog.quantity_in_stock,
                reorder_expr.label("reorder_point"),
            )
            .join(SupplierProfile, SupplierProfile.id == PartsCatalog.supplier_id)
            .where(PartsCatalog.quantity_in_stock <= reorder_expr)
            .order_by(PartsCatalog.quantity_in_stock.asc(), PartsCatalog.part_number.asc())
            .limit(limit)
        )
    ).all()

    return [
        {
            "catalog_id": _int(catalog_id),
            "supplier_id": _int(supplier_id),
            "supplier_name": supplier_name,
            "part_number": part_number,
            "part_name": part_name,
            "current_stock": _int(current_stock),
            "reorder_point": _int(reorder_point),
        }
        for catalog_id, supplier_id, supplier_name, part_number, part_name, current_stock, reorder_point in rows
    ]


async def get_event_timeline(session: AsyncSession, days: int = 14) -> List[Dict]:
    window_days = max(1, min(days, 90))
    cutoff = datetime.now(timezone.utc) - timedelta(days=window_days)
    day_expr = func.date(EventLog.created_at)
    rows = (
        await session.execute(
            select(day_expr, EventLog.event_type, func.count(EventLog.id))
            .where(EventLog.created_at >= cutoff)
            .group_by(day_expr, EventLog.event_type)
            .order_by(day_expr.asc(), EventLog.event_type.asc())
        )
    ).all()

    points: List[Dict] = []
    for day_value, event_type, count in rows:
        if isinstance(day_value, str):
            parsed_day = date.fromisoformat(day_value)
        elif isinstance(day_value, date):
            parsed_day = day_value
        else:
            parsed_day = datetime.now(timezone.utc).date()

        points.append(
            {
                "day": parsed_day,
                "event_type": event_type,
                "count": _int(count),
            }
        )
    return points


async def get_overview(session: AsyncSession) -> Dict:
    status_rows = await get_order_status_distribution(session)
    status_map = {row["status"]: row["count"] for row in status_rows}

    total_orders = sum(status_map.values())
    delivered_orders = status_map.get("DELIVERED", 0)
    cancelled_orders = status_map.get("CANCELLED", 0)
    open_orders = total_orders - delivered_orders - cancelled_orders

    active_deliveries = (
        await session.execute(
            select(func.count(Delivery.id)).where(Delivery.status.in_(["PLANNED", "IN_PROGRESS"]))
        )
    ).scalar_one()

    revenue = (
        await session.execute(
            select(
                func.sum(func.coalesce(OrderAssignment.assigned_price, 0.0) * func.coalesce(OrderItem.quantity, 0))
            )
            .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
            .join(Order, Order.id == OrderItem.order_id)
            .where(
                OrderAssignment.status.in_(["ACCEPTED", "FULFILLED"]),
                Order.status != "CANCELLED",
            )
        )
    ).scalar_one()

    avg_match_score = (
        await session.execute(select(func.avg(OrderAssignment.match_score)))
    ).scalar_one()
    avg_supplier_reliability = (
        await session.execute(select(func.avg(SupplierProfile.reliability_score)))
    ).scalar_one()

    reorder_expr = func.max(func.coalesce(PartsCatalog.min_order_quantity, 1) * 2, 5)
    low_stock_count = (
        await session.execute(
            select(func.count(PartsCatalog.id)).where(PartsCatalog.quantity_in_stock <= reorder_expr)
        )
    ).scalar_one()

    savings_tuple = (
        await session.execute(
            select(
                func.sum(func.coalesce(Delivery.naive_distance_km, 0.0)),
                func.sum(func.coalesce(Delivery.optimized_distance_km, 0.0)),
            ).where(Delivery.delivery_type == "batched")
        )
    ).first()
    naive = _float(savings_tuple[0])
    optimized = _float(savings_tuple[1])
    savings = max(0.0, naive - optimized)
    savings_percent = (savings / naive * 100.0) if naive > 0 else 0.0

    return {
        "total_orders": total_orders,
        "open_orders": open_orders,
        "delivered_orders": delivered_orders,
        "cancelled_orders": cancelled_orders,
        "active_deliveries": _int(active_deliveries),
        "total_revenue_inr": _float(revenue),
        "avg_match_score": _float(avg_match_score),
        "avg_supplier_reliability": _float(avg_supplier_reliability),
        "low_stock_items": _int(low_stock_count),
        "optimization_savings_km": savings,
        "optimization_savings_percent": savings_percent,
    }


async def get_full_snapshot(session: AsyncSession, timeline_days: int = 14) -> Dict:
    return {
        "overview": await get_overview(session),
        "orders": await get_order_status_distribution(session),
        "matching": await get_matching_analytics(session),
        "deliveries": await get_delivery_analytics(session),
        "suppliers": await get_supplier_performance(session),
        "low_stock": await get_low_stock_items(session),
        "events": await get_event_timeline(session, days=timeline_days),
    }
