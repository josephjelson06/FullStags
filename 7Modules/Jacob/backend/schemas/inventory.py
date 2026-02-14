from typing import List, Optional

try:
    from pydantic import BaseModel, ConfigDict

    class ORMBaseModel(BaseModel):
        model_config = ConfigDict(from_attributes=True)

except ImportError:  # pragma: no cover
    from pydantic import BaseModel

    class ORMBaseModel(BaseModel):
        class Config:
            orm_mode = True


class PartCategoryCreate(ORMBaseModel):
    name: str
    subcategory: Optional[str] = None


class PartCategoryResponse(ORMBaseModel):
    id: int
    name: str
    subcategory: Optional[str] = None


class CatalogEntryCreate(ORMBaseModel):
    category_id: int
    part_name: str
    part_number: str
    brand: Optional[str] = None
    unit_price: float
    quantity_in_stock: int
    min_order_quantity: int = 1
    lead_time_hours: int


class CatalogEntryUpdate(ORMBaseModel):
    category_id: Optional[int] = None
    part_name: Optional[str] = None
    part_number: Optional[str] = None
    brand: Optional[str] = None
    unit_price: Optional[float] = None
    quantity_in_stock: Optional[int] = None
    min_order_quantity: Optional[int] = None
    lead_time_hours: Optional[int] = None


class CatalogEntryResponse(ORMBaseModel):
    id: int
    supplier_id: int
    category_id: int
    part_name: str
    part_number: str
    normalized_part_number: str
    brand: Optional[str] = None
    unit_price: float
    quantity_in_stock: int
    min_order_quantity: int
    lead_time_hours: int
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    supplier_business_name: Optional[str] = None
    category_name: Optional[str] = None
    distance_km: Optional[float] = None


class InventoryTransactionResponse(ORMBaseModel):
    catalog_id: int
    change_amount: int
    reason: str
    created_at: Optional[str] = None


class CSVUploadError(ORMBaseModel):
    row_number: int
    error: str
    row_data: Optional[dict] = None


class CSVUploadResponse(ORMBaseModel):
    total_rows: int
    successful: int
    failed: int
    errors: List[CSVUploadError]


class CatalogListResponse(ORMBaseModel):
    items: List[CatalogEntryResponse]
    page: int
    page_size: int
    total: int
