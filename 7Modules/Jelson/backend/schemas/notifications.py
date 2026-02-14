from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict


class NotificationResponse(BaseModel):
    id: int
    user_id: int
    event_type: str
    title: str
    message: str
    is_read: bool
    metadata: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class NotificationListResponse(BaseModel):
    items: list[NotificationResponse]
    limit: int
    offset: int
    total: int


class MarkAllReadResponse(BaseModel):
    updated: int


class UnreadCountResponse(BaseModel):
    count: int


class EventLogResponse(BaseModel):
    id: int
    event_type: str
    entity_type: str | None = None
    entity_id: int | None = None
    payload: dict[str, Any] | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EventLogListResponse(BaseModel):
    items: list[EventLogResponse]
    limit: int
    offset: int
    total: int


SupportedEventType = Literal[
    "ORDER_PLACED",
    "SUPPLIER_MATCHED",
    "ORDER_CONFIRMED",
    "ORDER_DISPATCHED",
    "ORDER_IN_TRANSIT",
    "ORDER_DELIVERED",
    "ORDER_CANCELLED",
    "LOW_STOCK_ALERT",
    "DELIVERY_PLANNED",
    "DELIVERY_COMPLETED",
    "ETA_UPDATED",
]


class EventTestEmitRequest(BaseModel):
    event_type: SupportedEventType
    payload: dict[str, Any] = {}
    target_user_ids: list[int] = []


class EventTestEmitResponse(BaseModel):
    event_id: int
    event_type: str
    title: str
    message: str
    metadata: dict[str, Any]
    timestamp: str
    target_user_ids: list[int]
    notification_ids: list[int]
    notifications_created: int


class EventTestContextUser(BaseModel):
    id: int
    email: str
    role: str
    is_active: bool
    buyer_profile_id: int | None = None
    supplier_profile_id: int | None = None


class EventTestContextResponse(BaseModel):
    users: list[EventTestContextUser]
    sample_event_templates: dict[str, dict[str, Any]]


class EventLifecycleTestRequest(BaseModel):
    order_id: int
    buyer_user_id: int
    supplier_user_id: int
    supplier_id: int | None = None
    order_item_id: int = 1
    include_eta_update: bool = True
    include_order_cancelled: bool = False


class EventLifecycleTestResponse(BaseModel):
    emitted_events: list[str]
    results: list[EventTestEmitResponse]
