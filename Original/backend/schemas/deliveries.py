from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


DeliveryStatus = Literal["PLANNED", "IN_PROGRESS", "COMPLETED"]


class DeliveryResponse(BaseModel):
    id: int
    delivery_type: str
    status: str
    total_distance_km: float | None = None
    total_duration_minutes: float | None = None
    optimized_distance_km: float | None = None
    naive_distance_km: float | None = None
    route_geometry: str | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeliveryStatusUpdateRequest(BaseModel):
    status: DeliveryStatus


class BatchDeliveryRequest(BaseModel):
    assignment_ids: list[int]
