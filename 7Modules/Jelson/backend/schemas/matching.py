from datetime import datetime

from pydantic import BaseModel, ConfigDict


class MatchRunRequest(BaseModel):
    order_id: int


class MatchRunResponse(BaseModel):
    order_id: int
    matched_items: int
    assignments_created: int
    logs_written: int


class MatchingLogResponse(BaseModel):
    id: int
    order_item_id: int | None = None
    supplier_id: int | None = None
    distance_km: float | None = None
    distance_score: float | None = None
    reliability_score: float | None = None
    price_score: float | None = None
    urgency_score: float | None = None
    total_score: float | None = None
    rank: int | None = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
