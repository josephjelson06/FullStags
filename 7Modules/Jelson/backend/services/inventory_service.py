from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.events.bus import emit_event
from backend.models.catalog import InventoryTransaction, PartsCatalog
from backend.models.user import SupplierProfile, User

LOW_STOCK_THRESHOLD = 5


async def adjust_inventory(
    *,
    db: AsyncSession,
    current_user: User,
    catalog_id: int,
    change_amount: int,
    reason: str,
) -> InventoryTransaction:
    catalog_result = await db.execute(select(PartsCatalog).where(PartsCatalog.id == catalog_id))
    catalog = catalog_result.scalar_one_or_none()
    if catalog is None:
        raise ValueError("Catalog item not found")

    supplier_result = await db.execute(select(SupplierProfile).where(SupplierProfile.id == catalog.supplier_id))
    supplier = supplier_result.scalar_one_or_none()
    if supplier is None:
        raise ValueError("Supplier profile not found")

    if current_user.role != "admin" and supplier.user_id != current_user.id:
        raise PermissionError("Cannot modify another supplier's inventory")

    new_quantity = int(catalog.quantity_in_stock) + int(change_amount)
    if new_quantity < 0:
        raise ValueError("Insufficient stock for this adjustment")

    catalog.quantity_in_stock = new_quantity
    transaction = InventoryTransaction(
        catalog_id=catalog.id,
        change_amount=change_amount,
        reason=reason,
    )
    db.add(transaction)
    await db.commit()
    await db.refresh(transaction)

    if new_quantity <= LOW_STOCK_THRESHOLD:
        await emit_event(
            "LOW_STOCK_ALERT",
            {
                "catalog_id": catalog.id,
                "part_name": catalog.part_name,
                "part_number": catalog.part_number,
                "quantity_remaining": new_quantity,
                "supplier_id": supplier.id,
                "supplier_user_id": supplier.user_id,
                "entity_type": "inventory",
                "entity_id": catalog.id,
            },
            [supplier.user_id],
        )

    return transaction
