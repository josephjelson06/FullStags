import csv
import io
import math
import re
from datetime import datetime
from typing import List, Optional

from fastapi import UploadFile
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.events.bus import emit_event
from backend.models.inventory import InventoryTransaction, PartCategory, PartsCatalog
from backend.models.users import SupplierProfile
from backend.schemas.inventory import CSVUploadError, CSVUploadResponse, CatalogEntryResponse

LOW_STOCK_MULTIPLIER = 2
ABBREVIATION_MAP = {
    "BB": "BALL BEARING",
    "ZZ": "DOUBLE SHIELDED",
}
QUALIFIER_TOKENS = {
    "DOUBLE",
    "SINGLE",
    "SHIELDED",
    "SEALED",
    "OPEN",
    "TYPE",
}


def normalize_part_number(raw: str) -> str:
    if not raw:
        return ""
    value = raw.upper()
    for abbr, full in ABBREVIATION_MAP.items():
        value = re.sub(rf"\b{re.escape(abbr)}\b", full, value)
    value = re.sub(r"[^A-Z0-9]+", " ", value)
    tokens = [token for token in value.strip().split() if token]

    alpha_tokens: List[str] = []
    numeric_tokens: List[str] = []
    for token in tokens:
        if token.isdigit():
            numeric_tokens.append(token)
        else:
            if token not in QUALIFIER_TOKENS:
                alpha_tokens.append(token)

    return "".join(alpha_tokens + numeric_tokens)


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    radius = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlng / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


def _utc_timestamp() -> str:
    return datetime.utcnow().isoformat(sep=" ", timespec="seconds")


async def check_low_stock(session: AsyncSession, catalog_entry: PartsCatalog) -> bool:
    threshold = catalog_entry.min_order_quantity * LOW_STOCK_MULTIPLIER
    if catalog_entry.quantity_in_stock < threshold:
        supplier = await session.get(SupplierProfile, catalog_entry.supplier_id)
        await emit_event(
            "LOW_STOCK_ALERT",
            {
                "entity_type": "parts_catalog",
                "entity_id": catalog_entry.id,
                "catalog_id": catalog_entry.id,
                "supplier_id": catalog_entry.supplier_id,
                "quantity_in_stock": catalog_entry.quantity_in_stock,
                "min_order_quantity": catalog_entry.min_order_quantity,
            },
            [supplier.user_id] if supplier else [],
        )
        return True
    return False


async def process_csv_upload(
    session: AsyncSession, file: UploadFile, supplier_id: int
) -> CSVUploadResponse:
    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))
    required = {
        "part_name",
        "part_number",
        "category",
        "brand",
        "unit_price",
        "quantity",
        "min_order_qty",
        "lead_time_hours",
    }

    if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
        missing = sorted(required.difference(set(reader.fieldnames or [])))
        return CSVUploadResponse(
            total_rows=0,
            successful=0,
            failed=1,
            errors=[
                CSVUploadError(
                    row_number=0,
                    error=f"Missing required columns: {', '.join(missing)}",
                    row_data=None,
                )
            ],
        )

    errors: List[CSVUploadError] = []
    successful = 0
    total_rows = 0

    for row_number, row in enumerate(reader, start=2):
        total_rows += 1
        try:
            async with session.begin_nested():
                part_name = (row.get("part_name") or "").strip()
                part_number = (row.get("part_number") or "").strip()
                category_name = (row.get("category") or "").strip()
                brand = (row.get("brand") or "").strip() or None
                unit_price = float(row.get("unit_price") or 0)
                quantity = int(float(row.get("quantity") or 0))
                min_order_qty = int(float(row.get("min_order_qty") or 1))
                lead_time_hours = int(float(row.get("lead_time_hours") or 0))

                if not part_name or not part_number or not category_name:
                    raise ValueError("part_name, part_number and category are required")
                if unit_price <= 0:
                    raise ValueError("unit_price must be > 0")
                if quantity < 0:
                    raise ValueError("quantity must be >= 0")
                if min_order_qty <= 0:
                    raise ValueError("min_order_qty must be > 0")
                if lead_time_hours <= 0:
                    raise ValueError("lead_time_hours must be > 0")

                result = await session.execute(
                    select(PartCategory).where(func.lower(PartCategory.name) == category_name.lower())
                )
                category = result.scalar_one_or_none()
                if not category:
                    category = PartCategory(name=category_name, subcategory=None)
                    session.add(category)
                    await session.flush()

                normalized = normalize_part_number(part_number)
                existing_result = await session.execute(
                    select(PartsCatalog).where(
                        PartsCatalog.supplier_id == supplier_id,
                        PartsCatalog.part_number == part_number,
                    )
                )
                existing = existing_result.scalar_one_or_none()

                if existing:
                    delta = quantity - existing.quantity_in_stock
                    existing.part_name = part_name
                    existing.category_id = category.id
                    existing.brand = brand
                    existing.unit_price = unit_price
                    existing.quantity_in_stock = quantity
                    existing.min_order_quantity = min_order_qty
                    existing.lead_time_hours = lead_time_hours
                    existing.part_number = part_number
                    existing.normalized_part_number = normalized
                    existing.updated_at = _utc_timestamp()

                    session.add(
                        InventoryTransaction(
                            catalog_id=existing.id,
                            change_amount=delta,
                            reason="csv_upload",
                        )
                    )
                    await check_low_stock(session, existing)
                else:
                    new_entry = PartsCatalog(
                        supplier_id=supplier_id,
                        category_id=category.id,
                        part_name=part_name,
                        part_number=part_number,
                        normalized_part_number=normalized,
                        brand=brand,
                        unit_price=unit_price,
                        quantity_in_stock=quantity,
                        min_order_quantity=min_order_qty,
                        lead_time_hours=lead_time_hours,
                        updated_at=_utc_timestamp(),
                    )
                    session.add(new_entry)
                    await session.flush()
                    session.add(
                        InventoryTransaction(
                            catalog_id=new_entry.id,
                            change_amount=quantity,
                            reason="csv_upload",
                        )
                    )
                    await check_low_stock(session, new_entry)

                successful += 1
        except Exception as exc:  # noqa: BLE001
            errors.append(
                CSVUploadError(
                    row_number=row_number,
                    error=str(exc),
                    row_data=row,
                )
            )

    await session.commit()

    return CSVUploadResponse(
        total_rows=total_rows,
        successful=successful,
        failed=len(errors),
        errors=errors,
    )


async def decrement_stock(
    session: AsyncSession, catalog_id: int, quantity: int
) -> bool:
    entry = await session.get(PartsCatalog, catalog_id)
    if not entry:
        return False
    if entry.quantity_in_stock < quantity:
        return False

    entry.quantity_in_stock -= quantity
    entry.updated_at = _utc_timestamp()
    session.add(
        InventoryTransaction(
            catalog_id=entry.id,
            change_amount=-quantity,
            reason="order_confirmed",
        )
    )
    await session.commit()
    await check_low_stock(session, entry)
    return True


async def search_parts(
    session: AsyncSession,
    query: str,
    category_id: Optional[int],
    lat: float,
    lng: float,
    radius_km: float,
) -> List[CatalogEntryResponse]:
    normalized_query = normalize_part_number(query) if query else ""
    stmt = (
        select(PartsCatalog, SupplierProfile, PartCategory)
        .join(SupplierProfile, PartsCatalog.supplier_id == SupplierProfile.id)
        .join(PartCategory, PartsCatalog.category_id == PartCategory.id)
    )

    if category_id:
        stmt = stmt.where(PartsCatalog.category_id == category_id)

    if query:
        stmt = stmt.where(
            or_(
                PartsCatalog.normalized_part_number.like(f"%{normalized_query}%"),
                func.lower(PartsCatalog.part_name).like(f"%{query.lower()}%"),
            )
        )

    delta_lat = radius_km / 111.0
    if abs(math.cos(math.radians(lat))) < 1e-6:
        delta_lng = radius_km / 111.0
    else:
        delta_lng = radius_km / (111.0 * math.cos(math.radians(lat)))

    stmt = stmt.where(
        SupplierProfile.latitude.between(lat - delta_lat, lat + delta_lat),
        SupplierProfile.longitude.between(lng - delta_lng, lng + delta_lng),
    )

    results = await session.execute(stmt)
    entries: List[CatalogEntryResponse] = []
    for catalog, supplier, category in results.all():
        distance = haversine_km(lat, lng, supplier.latitude, supplier.longitude)
        if distance > radius_km:
            continue
        entries.append(
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
                supplier_business_name=supplier.business_name,
                category_name=category.name,
                distance_km=round(distance, 2),
            )
        )

    entries.sort(key=lambda item: item.distance_km or 0)
    return entries
