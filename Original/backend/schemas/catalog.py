from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PartCategoryCreateRequest(BaseModel):
    name: str = Field(min_length=2)
    subcategory: str | None = None


class PartCategoryResponse(BaseModel):
    id: int
    name: str
    subcategory: str | None = None

    model_config = ConfigDict(from_attributes=True)


class CatalogItemCreateRequest(BaseModel):
    category_id: int
    part_name: str = Field(min_length=2)
    part_number: str = Field(min_length=2)
    brand: str | None = None
    unit_price: float = Field(gt=0)
    quantity_in_stock: int = Field(ge=0)
    min_order_quantity: int = Field(default=1, ge=1)
    lead_time_hours: int = Field(ge=1)


class CatalogItemUpdateRequest(BaseModel):
    category_id: int | None = None
    part_name: str | None = None
    part_number: str | None = None
    brand: str | None = None
    unit_price: float | None = Field(default=None, gt=0)
    quantity_in_stock: int | None = Field(default=None, ge=0)
    min_order_quantity: int | None = Field(default=None, ge=1)
    lead_time_hours: int | None = Field(default=None, ge=1)


class CatalogItemResponse(BaseModel):
    id: int
    supplier_id: int | None = None
    category_id: int | None = None
    part_name: str
    part_number: str
    normalized_part_number: str
    brand: str | None = None
    unit_price: float
    quantity_in_stock: int
    min_order_quantity: int
    lead_time_hours: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
