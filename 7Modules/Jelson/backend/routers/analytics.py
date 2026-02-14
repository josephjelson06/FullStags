from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker
from backend.schemas.analytics import (
    AnalyticsKpisResponse,
    DemandAnalyticsResponse,
    GeoAnalyticsResponse,
    RouteAnalyticsResponse,
    SuppliersAnalyticsResponse,
)
from backend.services.analytics_service import (
    get_demand_analytics,
    get_geo_analytics,
    get_kpis,
    get_route_analytics,
    get_supplier_analytics,
)

router = APIRouter(
    prefix="/api/analytics",
    tags=["analytics"],
    dependencies=[Depends(RoleChecker(["admin"]))],
)


@router.get("/kpis", response_model=AnalyticsKpisResponse)
async def read_kpis(db: AsyncSession = Depends(get_db)):
    return await get_kpis(db)


@router.get("/demand", response_model=DemandAnalyticsResponse)
async def read_demand_analytics(db: AsyncSession = Depends(get_db)):
    return await get_demand_analytics(db)


@router.get("/routes", response_model=RouteAnalyticsResponse)
async def read_route_analytics(db: AsyncSession = Depends(get_db)):
    return await get_route_analytics(db)


@router.get("/suppliers", response_model=SuppliersAnalyticsResponse)
async def read_supplier_analytics(db: AsyncSession = Depends(get_db)):
    return await get_supplier_analytics(db)


@router.get("/geo", response_model=GeoAnalyticsResponse)
async def read_geo_analytics(db: AsyncSession = Depends(get_db)):
    return await get_geo_analytics(db)
