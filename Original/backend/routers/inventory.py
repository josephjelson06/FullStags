from typing import List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.user import User
from backend.models.inventory import InventoryTransaction, PartCategory, PartsCatalog
from backend.models.users import SupplierProfile
from backend.schemas.inventory import (
    CSVUploadResponse,
    CatalogEntryCreate,
    CatalogEntryResponse,
    CatalogEntryUpdate,
    CatalogListResponse,
    InventoryTransactionResponse,
    PartCategoryCreate,
    PartCategoryResponse,
)
from backend.services.inventory_service import (
    check_low_stock,
    normalize_part_number,
    process_csv_upload,
    search_parts,
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


async def _get_supplier_profile(
    session: AsyncSession, user_id: int
) -> SupplierProfile:
    result = await session.execute(
        select(SupplierProfile).where(SupplierProfile.user_id == user_id)
    )
    supplier = result.scalar_one_or_none()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier profile not found")
    return supplier


@router.get("/categories", response_model=List[PartCategoryResponse])
async def list_categories(session: AsyncSession = Depends(get_db)):
    result = await session.execute(select(PartCategory).order_by(PartCategory.name))
    return result.scalars().all()


@router.post(
    "/categories",
    response_model=PartCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def create_category(
    payload: PartCategoryCreate,
    session: AsyncSession = Depends(get_db),
):
    category = PartCategory(name=payload.name, subcategory=payload.subcategory)
    session.add(category)
    await session.commit()
    await session.refresh(category)
    return category


@router.post(
    "/catalog",
    response_model=CatalogEntryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def add_catalog_entry(
    payload: CatalogEntryCreate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    normalized = normalize_part_number(payload.part_number)
    entry = PartsCatalog(
        supplier_id=supplier.id,
        category_id=payload.category_id,
        part_name=payload.part_name,
        part_number=payload.part_number,
        normalized_part_number=normalized,
        brand=payload.brand,
        unit_price=payload.unit_price,
        quantity_in_stock=payload.quantity_in_stock,
        min_order_quantity=payload.min_order_quantity,
        lead_time_hours=payload.lead_time_hours,
    )
    session.add(entry)
    await session.flush()

    session.add(
        InventoryTransaction(
            catalog_id=entry.id,
            change_amount=payload.quantity_in_stock,
            reason="manual_adjustment",
        )
    )

    await session.commit()
    await session.refresh(entry)
    await check_low_stock(session, entry)

    category = await session.get(PartCategory, entry.category_id)
    return CatalogEntryResponse(
        id=entry.id,
        supplier_id=entry.supplier_id,
        category_id=entry.category_id,
        part_name=entry.part_name,
        part_number=entry.part_number,
        normalized_part_number=entry.normalized_part_number,
        brand=entry.brand,
        unit_price=entry.unit_price,
        quantity_in_stock=entry.quantity_in_stock,
        min_order_quantity=entry.min_order_quantity,
        lead_time_hours=entry.lead_time_hours,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        supplier_business_name=supplier.business_name,
        category_name=category.name if category else None,
    )


@router.put(
    "/catalog/{catalog_id}",
    response_model=CatalogEntryResponse,
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def update_catalog_entry(
    catalog_id: int,
    payload: CatalogEntryUpdate,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    entry = await session.get(PartsCatalog, catalog_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Catalog entry not found")
    if entry.supplier_id != supplier.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    previous_qty = entry.quantity_in_stock
    data = (
        payload.model_dump(exclude_unset=True)
        if hasattr(payload, "model_dump")
        else payload.dict(exclude_unset=True)
    )
    if "part_number" in data:
        entry.part_number = data["part_number"]
        entry.normalized_part_number = normalize_part_number(data["part_number"])
    for field, value in data.items():
        if field == "part_number":
            continue
        setattr(entry, field, value)

    entry.updated_at = datetime.utcnow().isoformat(sep=" ", timespec="seconds")

    if payload.quantity_in_stock is not None and payload.quantity_in_stock != previous_qty:
        session.add(
            InventoryTransaction(
                catalog_id=entry.id,
                change_amount=payload.quantity_in_stock - previous_qty,
                reason="manual_adjustment",
            )
        )

    await session.commit()
    await session.refresh(entry)
    await check_low_stock(session, entry)

    category = await session.get(PartCategory, entry.category_id)
    return CatalogEntryResponse(
        id=entry.id,
        supplier_id=entry.supplier_id,
        category_id=entry.category_id,
        part_name=entry.part_name,
        part_number=entry.part_number,
        normalized_part_number=entry.normalized_part_number,
        brand=entry.brand,
        unit_price=entry.unit_price,
        quantity_in_stock=entry.quantity_in_stock,
        min_order_quantity=entry.min_order_quantity,
        lead_time_hours=entry.lead_time_hours,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        supplier_business_name=supplier.business_name,
        category_name=category.name if category else None,
    )


@router.delete(
    "/catalog/{catalog_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def delete_catalog_entry(
    catalog_id: int,
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    entry = await session.get(PartsCatalog, catalog_id)
    if not entry:
        raise HTTPException(status_code=404, detail="Catalog entry not found")
    if entry.supplier_id != supplier.id:
        raise HTTPException(status_code=403, detail="Not allowed")

    await session.delete(entry)
    await session.commit()


@router.post(
    "/catalog/csv-upload",
    response_model=CSVUploadResponse,
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def csv_upload(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    return await process_csv_upload(session, file, supplier.id)


@router.get("/search", response_model=List[CatalogEntryResponse])
async def search_inventory(
    q: str = Query("", alias="q"),
    category_id: Optional[int] = Query(None),
    lat: float = Query(...),
    lng: float = Query(...),
    radius_km: float = Query(50.0),
    session: AsyncSession = Depends(get_db),
):
    return await search_parts(session, q, category_id, lat, lng, radius_km)


@router.get(
    "/transactions/{catalog_id}",
    response_model=List[InventoryTransactionResponse],
)
async def list_transactions(
    catalog_id: int,
    session: AsyncSession = Depends(get_db),
):
    result = await session.execute(
        select(InventoryTransaction)
        .where(InventoryTransaction.catalog_id == catalog_id)
        .order_by(InventoryTransaction.created_at.desc())
    )
    return [
        InventoryTransactionResponse(
            catalog_id=row.catalog_id,
            change_amount=row.change_amount,
            reason=row.reason,
            created_at=row.created_at,
        )
        for row in result.scalars().all()
    ]


@router.get(
    "/transactions",
    response_model=List[InventoryTransactionResponse],
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def list_recent_transactions(
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    result = await session.execute(
        select(InventoryTransaction)
        .join(PartsCatalog, InventoryTransaction.catalog_id == PartsCatalog.id)
        .where(PartsCatalog.supplier_id == supplier.id)
        .order_by(InventoryTransaction.created_at.desc())
        .limit(limit)
    )
    return [
        InventoryTransactionResponse(
            catalog_id=row.catalog_id,
            change_amount=row.change_amount,
            reason=row.reason,
            created_at=row.created_at,
        )
        for row in result.scalars().all()
    ]


@router.get(
    "/low-stock",
    response_model=List[CatalogEntryResponse],
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def list_low_stock(
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    result = await session.execute(
        select(PartsCatalog, PartCategory)
        .join(PartCategory, PartsCatalog.category_id == PartCategory.id)
        .where(PartsCatalog.supplier_id == supplier.id)
        .where(
            PartsCatalog.quantity_in_stock
            < (PartsCatalog.min_order_quantity * 2)
        )
        .order_by(PartsCatalog.quantity_in_stock.asc())
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
    return items


@router.get(
    "/catalog",
    response_model=CatalogListResponse,
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def list_own_catalog(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier = await _get_supplier_profile(session, current_user.id)
    total_result = await session.execute(
        select(func.count(PartsCatalog.id)).where(PartsCatalog.supplier_id == supplier.id)
    )
    total = total_result.scalar_one()

    result = await session.execute(
        select(PartsCatalog, PartCategory)
        .join(PartCategory, PartsCatalog.category_id == PartCategory.id)
        .where(PartsCatalog.supplier_id == supplier.id)
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

    return CatalogListResponse(
        items=items, page=page, page_size=page_size, total=total
    )
