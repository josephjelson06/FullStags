from __future__ import annotations

from typing import Dict, List

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..middleware.auth import RoleChecker, get_current_user
from ..schemas.analytics import (
    AnalyticsSnapshot,
    DeliveryAnalytics,
    EventTimelinePoint,
    InventoryRiskItem,
    KPIOverview,
    MatchingAnalytics,
    StatusCount,
    SupplierPerformance,
)
from ..services.analytics_service import (
    get_delivery_analytics,
    get_event_timeline,
    get_full_snapshot,
    get_low_stock_items,
    get_matching_analytics,
    get_order_status_distribution,
    get_overview,
    get_supplier_performance,
)

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(RoleChecker(["admin"]))],
)


@router.get(
    "/overview",
    response_model=KPIOverview,
    summary="Overview KPIs",
    description="High-level operational metrics across orders, deliveries, matching, inventory and savings.",
)
async def overview(
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_overview(session)


@router.get(
    "/orders/status-distribution",
    response_model=List[StatusCount],
    summary="Order status distribution",
    description="Order counts grouped by lifecycle status.",
)
async def order_status_distribution(
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_order_status_distribution(session)


@router.get(
    "/matching/quality",
    response_model=MatchingAnalytics,
    summary="Matching quality analytics",
    description="Matching candidate depth and score quality indicators.",
)
async def matching_quality(
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_matching_analytics(session)


@router.get(
    "/deliveries/efficiency",
    response_model=DeliveryAnalytics,
    summary="Delivery efficiency analytics",
    description="Route efficiency and savings metrics for single and batched deliveries.",
)
async def delivery_efficiency(
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_delivery_analytics(session)


@router.get(
    "/suppliers/performance",
    response_model=List[SupplierPerformance],
    summary="Supplier performance analytics",
    description="Assignment-level fulfillment and reliability view per supplier.",
)
async def supplier_performance(
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_supplier_performance(session)


@router.get(
    "/inventory/low-stock",
    response_model=List[InventoryRiskItem],
    summary="Low stock risk list",
    description="Catalog entries below dynamic reorder threshold.",
)
async def low_stock_inventory(
    limit: int = Query(default=20, ge=1, le=100, description="Maximum rows to return"),
    threshold: int = Query(default=5, ge=1, le=50, description="Minimum absolute reorder threshold"),
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_low_stock_items(session, limit=limit, threshold=threshold)


@router.get(
    "/events/timeline",
    response_model=List[EventTimelinePoint],
    summary="Event timeline",
    description="Daily event counts by event type for the selected time window.",
)
async def event_timeline(
    days: int = Query(default=14, ge=1, le=90, description="Window size in days"),
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_event_timeline(session, days=days)


@router.get(
    "/snapshot",
    response_model=AnalyticsSnapshot,
    summary="Analytics snapshot",
    description="Single-call endpoint returning all analytics sections for dashboard hydration.",
)
async def snapshot(
    days: int = Query(default=14, ge=1, le=90, description="Timeline window size in days"),
    session: AsyncSession = Depends(get_db),
    _: Dict = Depends(get_current_user),
):
    return await get_full_snapshot(session, timeline_days=days)
