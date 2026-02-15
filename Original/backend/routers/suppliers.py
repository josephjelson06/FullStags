from typing import List

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.user import User
from backend.models.inventory import PartCategory, PartsCatalog
from backend.models.users import SupplierProfile
from backend.schemas.inventory import CatalogEntryResponse, CatalogListResponse
from backend.schemas.suppliers import SupplierProfileResponse, SupplierSummaryResponse
from backend.services.inventory_service import haversine_km

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


async def _get_supplier(session: AsyncSession, supplier_id: int) -> SupplierProfile:
    supplier = await session.get(SupplierProfile, supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return supplier


@router.get(
    "/",
    response_model=List[SupplierProfileResponse],
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def list_suppliers(
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(SupplierProfile).order_by(SupplierProfile.id))
    return result.scalars().all()


@router.get(
    "/me",
    response_model=SupplierProfileResponse,
    dependencies=[Depends(RoleChecker(["supplier", "admin"]))],
)
async def get_my_supplier_profile(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await session.execute(
        select(SupplierProfile).where(SupplierProfile.user_id == current_user.id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    return supplier


@router.get("/nearby", response_model=List[SupplierProfileResponse])
async def nearby_suppliers(
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(50.0),
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(select(SupplierProfile))
    suppliers: List[SupplierProfileResponse] = []
    for supplier in result.scalars().all():
        distance = haversine_km(lat, lng, supplier.latitude, supplier.longitude)
        if distance <= radius_km:
            suppliers.append(
                SupplierProfileResponse(
                    id=supplier.id,
                    user_id=supplier.user_id,
                    business_name=supplier.business_name,
                    warehouse_address=supplier.warehouse_address,
                    gst_number=supplier.gst_number,
                    service_radius_km=supplier.service_radius_km,
                    latitude=supplier.latitude,
                    longitude=supplier.longitude,
                    reliability_score=supplier.reliability_score,
                    distance_km=round(distance, 2),
                )
            )

    suppliers.sort(key=lambda item: item.distance_km or 0)
    return suppliers


@router.get("/{supplier_id}", response_model=SupplierSummaryResponse)
async def get_supplier_summary(
    supplier_id: int,
    session: AsyncSession = Depends(get_db),
):
    supplier = await _get_supplier(session, supplier_id)

    stats = await session.execute(
        select(
            func.count(PartsCatalog.id),
            func.coalesce(
                func.sum(PartsCatalog.unit_price * PartsCatalog.quantity_in_stock), 0
            ),
            func.coalesce(func.avg(PartsCatalog.lead_time_hours), 0),
        ).where(PartsCatalog.supplier_id == supplier_id)
    )
    total_parts, total_stock_value, avg_lead_time = stats.one()

    return SupplierSummaryResponse(
        id=supplier.id,
        user_id=supplier.user_id,
        business_name=supplier.business_name,
        warehouse_address=supplier.warehouse_address,
        gst_number=supplier.gst_number,
        service_radius_km=supplier.service_radius_km,
        latitude=supplier.latitude,
        longitude=supplier.longitude,
        reliability_score=supplier.reliability_score,
        total_parts=total_parts or 0,
        total_stock_value=float(total_stock_value or 0),
        avg_lead_time_hours=float(avg_lead_time or 0),
    )


@router.get("/{supplier_id}/catalog", response_model=CatalogListResponse)
async def get_supplier_catalog(
    supplier_id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
):
    await _get_supplier(session, supplier_id)

    total_result = await session.execute(
        select(func.count(PartsCatalog.id)).where(
            PartsCatalog.supplier_id == supplier_id
        )
    )
    total = total_result.scalar_one()

    result = await session.execute(
        select(PartsCatalog, PartCategory)
        .join(PartCategory, PartsCatalog.category_id == PartCategory.id)
        .where(PartsCatalog.supplier_id == supplier_id)
        .order_by(PartsCatalog.created_at.desc())
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    items: List[CatalogEntryResponse] = []
    for catalog, category in result.all():
        items.append(
            CatalogEntryResponse(
                id=catalog.id,
                supplier_id=catalog.supplier_id,
                category_id=catalog.category_id,
                part_name=catalog.part_name,
                part_number=catalog.part_number,
                normalized_part_number=catalog.normalized_part_number,
                brand=catalog.brand,
                unit_price=catalog.unit_price,
                quantity_in_stock=catalog.quantity_in_stock,
                min_order_quantity=catalog.min_order_quantity,
                lead_time_hours=catalog.lead_time_hours,
                created_at=catalog.created_at,
                updated_at=catalog.updated_at,
                supplier_business_name=None,
                category_name=category.name,
            )
        )

    return CatalogListResponse(items=items, page=page, page_size=page_size, total=total)
