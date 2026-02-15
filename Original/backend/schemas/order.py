from datetime import datetime
from typing import List, Optional

from pydantic import Field

from backend.schemas.inventory import ORMBaseModel


class OrderItemCreate(ORMBaseModel):
    category_id: int
    part_number: str
    part_description: Optional[str] = None
    quantity: int


class OrderCreate(ORMBaseModel):
    items: List[OrderItemCreate]
    urgency: str = "standard"
    required_delivery_date: Optional[datetime] = None


class OrderAssignmentCreate(ORMBaseModel):
    supplier_id: int
    catalog_id: int
    price: float
    score: float


class StatusTransitionRequest(ORMBaseModel):
    new_status: str


class OrderAssignmentResponse(ORMBaseModel):
    id: int
    order_item_id: int
    supplier_id: int
    catalog_id: int
    assigned_price: Optional[float] = None
    match_score: Optional[float] = None
    status: str
    created_at: Optional[datetime] = None
    supplier_business_name: Optional[str] = None
    supplier_user_id: Optional[int] = None
    supplier_latitude: Optional[float] = None
    supplier_longitude: Optional[float] = None
    distance_km: Optional[float] = None


class OrderItemResponse(ORMBaseModel):
    id: int
    order_id: int
    category_id: int
    part_number: str
    part_description: Optional[str] = None
    quantity: int
    status: str
    category_name: Optional[str] = None
    assignments: List[OrderAssignmentResponse] = Field(default_factory=list)


class OrderHistoryEntry(ORMBaseModel):
    order_item_id: Optional[int] = None
    from_status: Optional[str] = None
    to_status: str
    timestamp: Optional[datetime] = None
    changed_by: Optional[int] = None


class OrderResponse(ORMBaseModel):
    id: int
    buyer_id: int
    status: str
    urgency: str
    required_delivery_date: Optional[datetime] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    buyer_factory_name: Optional[str] = None
    buyer_user_id: Optional[int] = None
    buyer_latitude: Optional[float] = None
    buyer_longitude: Optional[float] = None
    total_items: int = 0
    total_value: float = 0.0
    items: List[OrderItemResponse] = Field(default_factory=list)
    history: List[OrderHistoryEntry] = Field(default_factory=list)


class OrdersListResponse(ORMBaseModel):
    items: List[OrderResponse]
    page: int
    page_size: int
    total: int
