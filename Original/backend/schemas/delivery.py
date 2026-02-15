from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class DeliveryStopResponse(BaseModel):
    id: int
    delivery_id: int
    order_assignment_id: Optional[int] = None
    stop_type: str
    sequence_order: int
    latitude: float
    longitude: float
    time_window_start: Optional[datetime] = None
    time_window_end: Optional[datetime] = None
    eta: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryResponse(BaseModel):
    id: int
    delivery_type: str
    status: str
    total_distance_km: Optional[float] = None
    total_duration_minutes: Optional[float] = None
    optimized_distance_km: Optional[float] = None
    naive_distance_km: Optional[float] = None
    route_geometry: Optional[Dict] = None
    created_at: Optional[datetime] = None
    stops: List[DeliveryStopResponse] = Field(default_factory=list)
    latest_eta: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryCreate(BaseModel):
    order_assignment_ids: List[int] = Field(..., min_length=1)
    delivery_type: Literal["single", "batched"] = "single"

    @model_validator(mode="after")
    def validate_assignment_ids(self) -> "DeliveryCreate":
        if any(assignment_id <= 0 for assignment_id in self.order_assignment_ids):
            raise ValueError("order_assignment_ids must contain only positive integers")
        if len(set(self.order_assignment_ids)) != len(self.order_assignment_ids):
            raise ValueError("order_assignment_ids must be unique")
        if self.delivery_type == "single" and len(self.order_assignment_ids) != 1:
            raise ValueError("Single delivery requires exactly one order_assignment_id")
        if self.delivery_type == "batched" and len(self.order_assignment_ids) < 2:
            raise ValueError("Batched delivery requires at least two order_assignment_ids")
        return self


class RouteStop(BaseModel):
    index: int
    latitude: float
    longitude: float
    stop_type: str
    order_assignment_id: Optional[int] = None


class RouteOptimizationResult(BaseModel):
    optimized_distance: float
    naive_distance: float
    savings_percent: float
    route_geometry: Dict
    ordered_stops: List[RouteStop]


class VRPBatchRequest(BaseModel):
    order_assignment_ids: List[int] = Field(..., min_length=2)

    @model_validator(mode="after")
    def validate_batch_assignments(self) -> "VRPBatchRequest":
        if any(assignment_id <= 0 for assignment_id in self.order_assignment_ids):
            raise ValueError("order_assignment_ids must contain only positive integers")
        if len(set(self.order_assignment_ids)) != len(self.order_assignment_ids):
            raise ValueError("order_assignment_ids must be unique")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"order_assignment_ids": [101, 102, 103]}
        }
    )


class VRPBatchResult(BaseModel):
    deliveries_created: List[DeliveryResponse]
    total_savings_km: float
    total_savings_percent: float


class DeliveryStatusUpdate(BaseModel):
    status: Literal["PLANNED", "IN_PROGRESS", "COMPLETED"]

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"status": "IN_PROGRESS"},
                {"status": "COMPLETED"},
            ]
        }
    )


class DeliveryStatsResponse(BaseModel):
    avg_distance_km: float
    avg_duration_minutes: float
    total_savings_km: float
    total_savings_percent: float


class AvailableAssignmentResponse(BaseModel):
    id: int
    order_id: int
    order_item_id: int
    part_number: str
    quantity: int
    supplier_id: int
    supplier_name: str
    buyer_factory_name: str
    required_delivery_date: Optional[datetime] = None
