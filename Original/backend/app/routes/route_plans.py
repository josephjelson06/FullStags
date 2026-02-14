"""Route tracking — per-order 2-leg courier simulation."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.deps.auth import get_current_user
from app.models import LegInfo, RouteCoord, RouteResponse
from app.repositories import order_repo, user_repo

router = APIRouter(prefix="/api", tags=["route-tracking"])

_ROUTABLE = ("pending_acceptance", "picking", "courier_to_supplier", "courier_to_factory", "delivered")


@router.get("/orders/{order_id}/route", response_model=RouteResponse)
def get_route(order_id: str, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        order = order_repo.find_order_by_id(conn, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if user["role"] == "buyer" and order["buyer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You are not allowed to view route for this order")
        if user["role"] == "supplier" and order["selected_supplier_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You are not allowed to view route for this order")

        if order["status"] not in _ROUTABLE:
            raise HTTPException(status_code=409, detail="Route not available before supplier is selected")

        legs = order_repo.get_legs(conn, order_id)
        sup = user_repo.find_by_id(conn, order["selected_supplier_id"]) if order["selected_supplier_id"] else None

    sup_lat = sup["lat"] if sup else order["delivery_lat"]
    sup_lng = sup["lng"] if sup else order["delivery_lng"]
    factory_lat = order["delivery_lat"]
    factory_lng = order["delivery_lng"]

    if order["total_time_minutes"] and order["total_time_minutes"] > 0:
        created = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
        elapsed = (datetime.now(UTC) - created).total_seconds() / 60
        progress = min(1.0, max(0.0, elapsed / order["total_time_minutes"]))
    else:
        progress = 0.0

    courier_lat = sup_lat + (factory_lat - sup_lat) * progress
    courier_lng = sup_lng + (factory_lng - sup_lng) * progress

    eta_remaining = 0
    if order["total_time_minutes"]:
        created = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
        elapsed = (datetime.now(UTC) - created).total_seconds() / 60
        eta_remaining = max(0, int(order["total_time_minutes"] - elapsed))

    return RouteResponse(
        orderId=order_id, status=order["status"],
        supplierLocation=RouteCoord(lat=sup_lat, lng=sup_lng),
        factoryLocation=RouteCoord(lat=factory_lat, lng=factory_lng),
        courierCurrentLocation=RouteCoord(lat=round(courier_lat, 6), lng=round(courier_lng, 6)),
        etaMinutesRemaining=eta_remaining,
        legs=[LegInfo(label=l["label"], status=l["status"]) for l in legs],
    )