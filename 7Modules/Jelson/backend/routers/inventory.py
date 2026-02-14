from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.catalog import InventoryTransaction, PartsCatalog
from backend.models.user import SupplierProfile, User
from backend.schemas.inventory import InventoryAdjustRequest, InventoryTransactionResponse
from backend.services.inventory_service import adjust_inventory

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("/transactions", response_model=list[InventoryTransactionResponse])
async def list_inventory_transactions(
    limit: int = Query(default=50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(InventoryTransaction)
        .order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.id.desc())
        .limit(limit)
    )

    if current_user.role == "supplier":
        supplier_result = await db.execute(select(SupplierProfile).where(SupplierProfile.user_id == current_user.id))
        supplier_profile = supplier_result.scalar_one_or_none()
        if supplier_profile is None:
            return []

        stmt = (
            select(InventoryTransaction)
            .join(PartsCatalog, PartsCatalog.id == InventoryTransaction.catalog_id)
            .where(PartsCatalog.supplier_id == supplier_profile.id)
            .order_by(InventoryTransaction.created_at.desc(), InventoryTransaction.id.desc())
            .limit(limit)
        )
    elif current_user.role not in {"admin", "supplier"}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")

    result = await db.execute(stmt)
    return result.scalars().all()


@router.post(
    "/adjust",
    response_model=InventoryTransactionResponse,
    dependencies=[Depends(RoleChecker(["supplier", "admin"]))],
)
async def adjust_inventory_route(
    payload: InventoryAdjustRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        transaction = await adjust_inventory(
            db=db,
            current_user=current_user,
            catalog_id=payload.catalog_id,
            change_amount=payload.change_amount,
            reason=payload.reason,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    return transaction
