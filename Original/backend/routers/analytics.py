from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker
from backend.schemas.analytics import AnalyticsSnapshot
from backend.services.analytics_service import get_full_snapshot

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(RoleChecker(["admin"]))],
)


@router.get("/snapshot", response_model=AnalyticsSnapshot)
async def read_analytics_snapshot(
    timeline_days: int = Query(14, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
):
    """Full analytics snapshot: KPIs, orders, matching, deliveries, suppliers, low-stock, events."""
    return await get_full_snapshot(db, timeline_days=timeline_days)


@router.get("/kpis")
async def read_kpis(db: AsyncSession = Depends(get_db)):
    from backend.services.analytics_service import get_overview

    return await get_overview(db)


@router.get("/demand")
async def read_demand_analytics(db: AsyncSession = Depends(get_db)):
    from backend.services.analytics_service import (
        get_order_status_distribution,
        get_matching_analytics,
    )

    return {
        "orders_by_status": await get_order_status_distribution(db),
        "matching": await get_matching_analytics(db),
    }


@router.get("/routes")
async def read_route_analytics(db: AsyncSession = Depends(get_db)):
    from backend.services.analytics_service import get_delivery_analytics

    return await get_delivery_analytics(db)


@router.get("/suppliers")
async def read_supplier_analytics(db: AsyncSession = Depends(get_db)):
    from backend.services.analytics_service import get_supplier_performance

    return {"suppliers": await get_supplier_performance(db)}


@router.get("/geo")
async def read_geo_analytics(db: AsyncSession = Depends(get_db)):
    from backend.services.analytics_service import get_low_stock_items

    return {"low_stock": await get_low_stock_items(db)}


admin_router = APIRouter(
    prefix="/api/admin",
    tags=["admin"],
    dependencies=[Depends(RoleChecker(["admin"]))],
)


@admin_router.get("/dashboard")
async def admin_dashboard(db: AsyncSession = Depends(get_db)):
    """Admin dashboard — returns KPIs + summary metrics."""
    from backend.services.analytics_service import get_overview

    return await get_overview(db)
