from __future__ import annotations

from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MatchRequest(BaseModel):
    order_item_id: Optional[int] = Field(default=None, gt=0)
    item_ids: Optional[List[int]] = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_selector(self) -> "MatchRequest":
        has_order_item = self.order_item_id is not None
        has_item_ids = bool(self.item_ids)
        if has_order_item == has_item_ids:
            raise ValueError("Provide exactly one of order_item_id or item_ids")
        if self.item_ids and any(item_id <= 0 for item_id in self.item_ids):
            raise ValueError("item_ids must contain only positive integers")
        return self


class CatalogEntryDetails(BaseModel):
    id: int
    supplier_id: int
    category_id: Optional[int] = None
    part_name: str
    part_number: str
    brand: Optional[str] = None
    unit_price: float
    quantity_in_stock: int
    lead_time_hours: int

    model_config = ConfigDict(from_attributes=True)


class SupplierScore(BaseModel):
    supplier_id: int
    business_name: str
    distance_km: float
    distance_score: float
    reliability_score: float
    price_score: float
    urgency_score: float
    total_score: float
    catalog_entry: CatalogEntryDetails


class MatchResult(BaseModel):
    order_item_id: int
    top_matches: List[SupplierScore]
    selected_supplier_id: Optional[int] = None


class WeightProfile(BaseModel):
    distance: float = Field(..., ge=0, le=1)
    reliability: float = Field(..., ge=0, le=1)
    price: float = Field(..., ge=0, le=1)
    urgency: float = Field(..., ge=0, le=1)


class MatchConfigResponse(BaseModel):
    weight_profiles: Dict[str, WeightProfile]


class MatchConfigUpdate(BaseModel):
    weight_profiles: Dict[str, WeightProfile]

    @model_validator(mode="after")
    def validate_weights(self) -> "MatchConfigUpdate":
        for urgency, profile in self.weight_profiles.items():
            total = profile.distance + profile.reliability + profile.price + profile.urgency
            if abs(total - 1.0) > 0.01:
                raise ValueError(f"Weights for {urgency} must sum to 1.0")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "weight_profiles": {
                    "standard": {"distance": 0.2, "reliability": 0.25, "price": 0.35, "urgency": 0.2},
                    "urgent": {"distance": 0.3, "reliability": 0.25, "price": 0.15, "urgency": 0.3},
                    "critical": {"distance": 0.35, "reliability": 0.2, "price": 0.1, "urgency": 0.35},
                }
            }
        }
    )


class MatchSimulationRequest(BaseModel):
    order_id: Optional[int] = Field(default=None, gt=0)
    order_item_id: Optional[int] = Field(default=None, gt=0)
    item_ids: Optional[List[int]] = Field(default=None, min_length=1)

    @model_validator(mode="after")
    def validate_selector(self) -> "MatchSimulationRequest":
        selectors = [
            self.order_id is not None,
            self.order_item_id is not None,
            bool(self.item_ids),
        ]
        if sum(selectors) != 1:
            raise ValueError("Provide exactly one of order_id, order_item_id, or item_ids")
        if self.item_ids and any(item_id <= 0 for item_id in self.item_ids):
            raise ValueError("item_ids must contain only positive integers")
        return self

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {"order_id": 1},
                {"order_item_id": 7},
                {"item_ids": [7, 8, 9]},
            ]
        }
    )


class MatchLogEntry(BaseModel):
    id: int
    order_item_id: int
    supplier_id: int
    distance_km: float
    distance_score: float
    reliability_score: float
    price_score: float
    urgency_score: float
    total_score: float
    rank: int
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class OrderItemSummary(BaseModel):
    id: int
    part_number: str
    part_description: Optional[str] = None
    quantity: int
    status: str

    model_config = ConfigDict(from_attributes=True)


class OrderSummary(BaseModel):
    id: int
    status: str
    urgency: str
    required_delivery_date: Optional[datetime] = None
    items: List[OrderItemSummary]

    model_config = ConfigDict(from_attributes=True)
