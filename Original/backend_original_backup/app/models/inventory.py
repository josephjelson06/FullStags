"""Inventory request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class CreateInventoryRequest(BaseModel):
    partName: str = Field(min_length=1, max_length=160)
    partNumber: str = Field(min_length=1, max_length=80)
    quantity: int = Field(ge=0)
    price: float = Field(gt=0)


class PatchInventoryRequest(BaseModel):
    partName: str | None = Field(default=None, max_length=160)
    partNumber: str | None = Field(default=None, max_length=80)
    quantity: int | None = Field(default=None, ge=0)
    price: float | None = Field(default=None, gt=0)


class InventoryItemResponse(BaseModel):
    itemId: str
    partName: str
    partNumber: str
    quantity: int
    price: float


class InventoryListResponse(BaseModel):
    supplierId: str
    pickTimeMinutes: int
    items: list[InventoryItemResponse]
    page: int
    pageSize: int
    total: int
