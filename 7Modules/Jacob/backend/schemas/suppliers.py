from typing import Optional

from backend.schemas.inventory import ORMBaseModel


class SupplierProfileResponse(ORMBaseModel):
    id: int
    user_id: int
    business_name: str
    warehouse_address: Optional[str] = None
    gst_number: Optional[str] = None
    service_radius_km: float
    latitude: float
    longitude: float
    reliability_score: float
    distance_km: Optional[float] = None


class SupplierSummaryResponse(SupplierProfileResponse):
    total_parts: int
    total_stock_value: float
    avg_lead_time_hours: float
