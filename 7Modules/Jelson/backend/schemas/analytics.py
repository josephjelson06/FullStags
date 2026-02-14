from datetime import datetime

from pydantic import BaseModel


class AnalyticsKpisResponse(BaseModel):
    total_orders: int
    fulfillment_rate_percent: float
    avg_matching_time_seconds: float | None = None
    avg_delivery_eta_minutes: float | None = None
    route_efficiency_percent: float | None = None


class CategoryDemandPoint(BaseModel):
    category_id: int
    category_name: str
    order_count: int


class OrdersOverTimePoint(BaseModel):
    date: str
    order_count: int


class RegionDemandPoint(BaseModel):
    region: str
    order_count: int


class DemandAnalyticsResponse(BaseModel):
    top_categories: list[CategoryDemandPoint]
    orders_over_time: list[OrdersOverTimePoint]
    orders_by_region: list[RegionDemandPoint]


class RouteComparisonPoint(BaseModel):
    delivery_id: int
    created_at: datetime
    naive_distance_km: float
    optimized_distance_km: float
    km_saved: float
    percent_saved: float


class RouteDistanceTrendPoint(BaseModel):
    date: str
    avg_distance_km: float
    delivery_count: int


class RouteAnalyticsResponse(BaseModel):
    total_km_saved: float
    batched_deliveries: list[RouteComparisonPoint]
    avg_distance_over_time: list[RouteDistanceTrendPoint]


class SupplierPerformancePoint(BaseModel):
    supplier_id: int
    supplier_user_id: int
    supplier_name: str
    orders_fulfilled: int
    avg_dispatch_time_seconds: float | None = None
    reliability_score: float | None = None
    revenue: float


class SuppliersAnalyticsResponse(BaseModel):
    suppliers: list[SupplierPerformancePoint]


class SupplierGeoPoint(BaseModel):
    supplier_id: int
    supplier_name: str
    latitude: float
    longitude: float
    total_stock: int
    stock_band: str


class BuyerGeoPoint(BaseModel):
    buyer_id: int
    buyer_name: str
    latitude: float
    longitude: float
    order_count: int
    region: str


class GeoAnalyticsResponse(BaseModel):
    suppliers: list[SupplierGeoPoint]
    buyers: list[BuyerGeoPoint]
