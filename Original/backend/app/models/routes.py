"""Route tracking schemas."""

from __future__ import annotations

from pydantic import BaseModel

from app.models.shared import LegStatus, OrderStatus


class LegInfo(BaseModel):
    label: str
    status: LegStatus


class RouteCoord(BaseModel):
    lat: float
    lng: float


class RouteResponse(BaseModel):
    orderId: str
    status: OrderStatus
    supplierLocation: RouteCoord
    factoryLocation: RouteCoord
    courierCurrentLocation: RouteCoord
    etaMinutesRemaining: int
    legs: list[LegInfo]
