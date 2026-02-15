"""Admin dashboard metrics."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query

from app.config import DOWNTIME_COST_PER_MINUTE
from app.database import get_db
from app.deps.auth import require_role
from app.models import DashboardResponse
from app.repositories import order_repo

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.get("/dashboard", response_model=DashboardResponse)
def dashboard(
    dateFrom: str | None = Query(default=None),
    dateTo: str | None = Query(default=None),
    user: dict = Depends(require_role("admin")),
):
    today = datetime.now(UTC).strftime("%Y-%m-%d")
    d_from = dateFrom or today
    d_to = dateTo or today

    if d_from > d_to:
        raise HTTPException(status_code=400, detail="dateFrom must be before or equal to dateTo")

    with get_db() as conn:
        total_orders = order_repo.count_orders_in_range(conn, d_from, d_to)
        avg_delivery = order_repo.avg_delivery_time(conn, d_from, d_to)
        delivered_count = order_repo.count_delivered_in_range(conn, d_from, d_to)
        total_minutes = order_repo.sum_fulfillment_minutes(conn, d_from, d_to)
        active_count = order_repo.count_active_orders(conn)
        pending_count = order_repo.count_pending_orders(conn)

    fulfillment_rate = round(delivered_count / total_orders, 2) if total_orders > 0 else 0.0
    total_downtime_saved = round(total_minutes * DOWNTIME_COST_PER_MINUTE, 2)

    return DashboardResponse(
        totalOrdersToday=total_orders,
        averageMatchTimeSeconds=28,  # v0 stub
        averageDeliveryTimeMinutes=int(avg_delivery),
        fulfillmentRate=fulfillment_rate,
        totalDowntimeSavedDollars=total_downtime_saved,
        activeOrdersCount=active_count,
        pendingOrdersCount=pending_count,
    )