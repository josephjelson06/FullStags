"""Inventory CRUD — supplier-scoped."""

from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.deps.auth import require_role
from app.models import (
    CreateInventoryRequest,
    InventoryItemResponse,
    InventoryListResponse,
    PatchInventoryRequest,
)
from app.repositories import inventory_repo

router = APIRouter(prefix="/api", tags=["inventory"])


# ──── D1: List inventory ────
@router.get("/inventory", response_model=InventoryListResponse)
def list_inventory(
    q: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(require_role("supplier")),
):
    with get_db() as conn:
        rows, total = inventory_repo.list_for_supplier(conn, user["id"], q, pageSize, (page - 1) * pageSize)

    return InventoryListResponse(
        supplierId=user["id"],
        pickTimeMinutes=user["pick_time_minutes"],
        items=[
            InventoryItemResponse(
                itemId=r["id"], partName=r["part_name"], partNumber=r["part_number"],
                quantity=r["quantity"], price=r["price"],
            )
            for r in rows
        ],
        page=page, pageSize=pageSize, total=total,
    )


# ──── D2: Create inventory item ────
@router.post("/inventory", response_model=InventoryItemResponse, status_code=201)
def create_inventory(body: CreateInventoryRequest, user: dict = Depends(require_role("supplier"))):
    with get_db() as conn:
        if inventory_repo.find_by_supplier_and_part(conn, user["id"], body.partNumber.strip()):
            raise HTTPException(status_code=409, detail="Inventory item with same partNumber already exists")

        item_id = f"inv_{uuid4().hex[:6]}"
        inventory_repo.create(conn, item_id, user["id"], body.partName.strip(), body.partNumber.strip(), body.quantity, body.price)

    return InventoryItemResponse(
        itemId=item_id, partName=body.partName.strip(),
        partNumber=body.partNumber.strip(), quantity=body.quantity, price=body.price,
    )


# ──── D3: Patch inventory item ────
@router.patch("/inventory/{item_id}", response_model=InventoryItemResponse)
def patch_inventory(item_id: str, body: PatchInventoryRequest, user: dict = Depends(require_role("supplier"))):
    with get_db() as conn:
        item = inventory_repo.find_by_id(conn, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        if item["supplier_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You do not own this inventory item")

        updates: dict = {}
        if body.partName is not None:
            updates["part_name"] = body.partName.strip()
        if body.partNumber is not None:
            if inventory_repo.check_part_number_duplicate(conn, user["id"], body.partNumber.strip(), item_id):
                raise HTTPException(status_code=409, detail="partNumber already used by another inventory item")
            updates["part_number"] = body.partNumber.strip()
        if body.quantity is not None:
            updates["quantity"] = body.quantity
        if body.price is not None:
            updates["price"] = body.price

        if not updates:
            raise HTTPException(status_code=400, detail="At least one updatable field is required")

        inventory_repo.update(conn, item_id, updates)
        updated = inventory_repo.find_by_id(conn, item_id)

    return InventoryItemResponse(
        itemId=updated["id"], partName=updated["part_name"],
        partNumber=updated["part_number"], quantity=updated["quantity"], price=updated["price"],
    )


# ──── D4: Delete inventory item ────
@router.delete("/inventory/{item_id}")
def delete_inventory(item_id: str, user: dict = Depends(require_role("supplier"))):
    with get_db() as conn:
        item = inventory_repo.find_by_id(conn, item_id)
        if not item:
            raise HTTPException(status_code=404, detail="Inventory item not found")
        if item["supplier_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You do not own this inventory item")
        inventory_repo.delete(conn, item_id)

    return {"itemId": item_id, "deleted": True}