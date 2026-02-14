from __future__ import annotations

from datetime import date
from typing import Dict, List

from pydantic import BaseModel, Field


class KPIOverview(BaseModel):
    total_orders: int
    open_orders: int
    delivered_orders: int
    cancelled_orders: int
    active_deliveries: int
    total_revenue_inr: float
    avg_match_score: float
    avg_supplier_reliability: float
    low_stock_items: int
    optimization_savings_km: float
    optimization_savings_percent: float


class StatusCount(BaseModel):
    status: str
    count: int


class MatchingAnalytics(BaseModel):
    total_items_scored: int
    avg_candidates_per_item: float
    avg_top_score: float
    avg_selected_score: float
    urgency_top_score: Dict[str, float] = Field(default_factory=dict)


class DeliveryAnalytics(BaseModel):
    total_deliveries: int
    planned_deliveries: int
    in_progress_deliveries: int
    completed_deliveries: int
    avg_distance_km: float
    avg_duration_minutes: float
    total_naive_distance_km: float
    total_optimized_distance_km: float
    total_savings_km: float
    total_savings_percent: float


class SupplierPerformance(BaseModel):
    supplier_id: int
    supplier_name: str
    reliability_score: float
    assignments_total: int
    fulfilled_assignments: int
    rejected_assignments: int
    fulfillment_rate: float
    avg_match_score: float


class InventoryRiskItem(BaseModel):
    catalog_id: int
    supplier_id: int
    supplier_name: str
    part_number: str
    part_name: str
    current_stock: int
    reorder_point: int


class EventTimelinePoint(BaseModel):
    day: date
    event_type: str
    count: int


class AnalyticsSnapshot(BaseModel):
    overview: KPIOverview
    orders: List[StatusCount]
    matching: MatchingAnalytics
    deliveries: DeliveryAnalytics
    suppliers: List[SupplierPerformance]
    low_stock: List[InventoryRiskItem]
    events: List[EventTimelinePoint]
