from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


OrderStatus = Literal[
    "PLACED",
    "MATCHED",
    "CONFIRMED",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
]

OrderItemStatus = Literal[
    "PENDING",
    "MATCHED",
    "CONFIRMED",
    "DISPATCHED",
    "IN_TRANSIT",
    "DELIVERED",
    "CANCELLED",
]

AssignmentStatus = Literal["PROPOSED", "ACCEPTED", "REJECTED", "FULFILLED"]
OrderUrgency = Literal["standard", "urgent", "critical"]


class OrderItemCreateRequest(BaseModel):
    category_id: int
    part_number: str = Field(min_length=2)
    part_description: str | None = None
    quantity: int = Field(ge=1)


class OrderCreateRequest(BaseModel):
    urgency: OrderUrgency = "standard"
    required_delivery_date: datetime | None = None
    items: list[OrderItemCreateRequest] = Field(min_length=1)


class OrderStatusUpdateRequest(BaseModel):
    status: OrderStatus


class AssignmentStatusUpdateRequest(BaseModel):
    status: AssignmentStatus


class OrderAssignmentResponse(BaseModel):
    id: int
    order_item_id: int | None = None
    supplier_id: int | None = None
    catalog_id: int | None = None
    assigned_price: float | None = None
    match_score: float | None = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class OrderItemResponse(BaseModel):
    id: int
    order_id: int | None = None
    category_id: int | None = None
    part_number: str
    part_description: str | None = None
    quantity: int
    status: str
    assignments: list[OrderAssignmentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class OrderResponse(BaseModel):
    id: int
    buyer_id: int | None = None
    status: str
    urgency: str
    required_delivery_date: datetime | None = None
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemResponse] = []

    model_config = ConfigDict(from_attributes=True)
