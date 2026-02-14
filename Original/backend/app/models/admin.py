"""Admin dashboard schemas."""

from __future__ import annotations

from pydantic import BaseModel


class DashboardResponse(BaseModel):
    totalOrdersToday: int
    averageMatchTimeSeconds: int
    averageDeliveryTimeMinutes: int
    fulfillmentRate: float
    totalDowntimeSavedDollars: float
    activeOrdersCount: int
    pendingOrdersCount: int
