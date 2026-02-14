from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.catalog import PartCategory, PartsCatalog
from backend.models.user import SupplierProfile, User
from backend.schemas.catalog import (
    CatalogItemCreateRequest,
    CatalogItemResponse,
    CatalogItemUpdateRequest,
    PartCategoryCreateRequest,
    PartCategoryResponse,
)
from backend.services.matching_service import normalize_part_number

router = APIRouter(prefix="/api/suppliers", tags=["suppliers"])


async def _get_supplier_profile_by_user(db: AsyncSession, user_id: int) -> SupplierProfile:
    result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == user_id))
    supplier_profile = result.scalar_one_or_none()
    if supplier_profile is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier profile not found")
    return supplier_profile


@router.get("/categories", response_model=list[PartCategoryResponse])
async def list_categories(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    result = await db.execute(select(PartCategory).order_by(PartCategory.name.asc(), PartCategory.id.asc()))
    return result.scalars().all()


@router.post(
    "/categories",
    response_model=PartCategoryResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def create_category(payload: PartCategoryCreateRequest, db: AsyncSession = Depends(get_db)):
    category = PartCategory(name=payload.name, subcategory=payload.subcategory)
    db.add(category)
    await db.commit()
    await db.refresh(category)
    return category


@router.get("/profile")
async def get_supplier_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if current_user.role != "supplier":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only suppliers can view supplier profile")
    return await _get_supplier_profile_by_user(db, current_user.id)


@router.get("/catalog", response_model=list[CatalogItemResponse])
async def list_catalog_items(
    supplier_id: int | None = Query(default=None),
    part_number: str | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = select(PartsCatalog).order_by(PartsCatalog.updated_at.desc(), PartsCatalog.id.desc())
    if current_user.role == "supplier":
        own_supplier = await _get_supplier_profile_by_user(db, current_user.id)
        stmt = stmt.where(PartsCatalog.supplier_id == own_supplier.id)
    elif supplier_id is not None:
        stmt = stmt.where(PartsCatalog.supplier_id == supplier_id)

    if part_number:
        normalized = normalize_part_number(part_number)
        stmt = stmt.where(PartsCatalog.normalized_part_number == normalized)

    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/catalog",
    response_model=CatalogItemResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(RoleChecker(["supplier"]))],
)
async def create_catalog_item(
    payload: CatalogItemCreateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    supplier_profile = await _get_supplier_profile_by_user(db, current_user.id)

    category_result = await db.execute(select(PartCategory).where(PartCategory.id == payload.category_id))
    if category_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category does not exist")

    catalog_item = PartsCatalog(
        supplier_id=supplier_profile.id,
        category_id=payload.category_id,
        part_name=payload.part_name,
        part_number=payload.part_number,
        normalized_part_number=normalize_part_number(payload.part_number),
        brand=payload.brand,
        unit_price=payload.unit_price,
        quantity_in_stock=payload.quantity_in_stock,
        min_order_quantity=payload.min_order_quantity,
        lead_time_hours=payload.lead_time_hours,
        updated_at=datetime.utcnow(),
    )
    db.add(catalog_item)
    await db.commit()
    await db.refresh(catalog_item)
    return catalog_item


@router.patch("/catalog/{catalog_id}", response_model=CatalogItemResponse)
async def update_catalog_item(
    catalog_id: int,
    payload: CatalogItemUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(select(PartsCatalog).where(PartsCatalog.id == catalog_id))
    catalog_item = result.scalar_one_or_none()
    if catalog_item is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Catalog item not found")

    if current_user.role == "supplier":
        supplier_profile = await _get_supplier_profile_by_user(db, current_user.id)
        if catalog_item.supplier_id != supplier_profile.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot edit another supplier catalog")
    elif current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    if payload.category_id is not None:
        category_result = await db.execute(select(PartCategory).where(PartCategory.id == payload.category_id))
        if category_result.scalar_one_or_none() is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Category does not exist")
        catalog_item.category_id = payload.category_id
    if payload.part_name is not None:
        catalog_item.part_name = payload.part_name
    if payload.part_number is not None:
        catalog_item.part_number = payload.part_number
        catalog_item.normalized_part_number = normalize_part_number(payload.part_number)
    if payload.brand is not None:
        catalog_item.brand = payload.brand
    if payload.unit_price is not None:
        catalog_item.unit_price = payload.unit_price
    if payload.quantity_in_stock is not None:
        catalog_item.quantity_in_stock = payload.quantity_in_stock
    if payload.min_order_quantity is not None:
        catalog_item.min_order_quantity = payload.min_order_quantity
    if payload.lead_time_hours is not None:
        catalog_item.lead_time_hours = payload.lead_time_hours

    catalog_item.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(catalog_item)
    return catalog_item
