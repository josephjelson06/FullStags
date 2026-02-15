"""Order and matching request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.shared import Location, OrderAction, OrderStatus, Urgency


class CreateOrderRequest(BaseModel):
    partName: str | None = Field(default=None, max_length=160)
    partNumber: str | None = Field(default=None, max_length=80)
    urgency: Urgency
    deliveryLocation: Location


class OrderActionRequest(BaseModel):
    action: OrderAction
    matchId: str | None = None


class MatchResponse(BaseModel):
    matchId: str
    supplierId: str
    supplierName: str
    distanceKm: float
    pickTimeMinutes: int
    driveTimeMinutes: int
    totalTimeMinutes: int
    partPrice: float
    supplierLocation: Location


class OrderMatchesResponse(BaseModel):
    orderId: str
    matches: list[MatchResponse]


class SelectedSupplierInfo(BaseModel):
    supplierId: str
    supplierName: str
    totalTimeMinutes: int


class OrderActionResponse(BaseModel):
    orderId: str
    status: OrderStatus
    selectedSupplier: SelectedSupplierInfo | None = None
    message: str = "Order updated"
    updatedAt: str
    deliveredAt: str | None = None
    totalFulfillmentMinutes: int | None = None
    estimatedDowntimeSaved: float | None = None


class OrderBuyer(BaseModel):
    id: str
    name: str
    companyName: str


class OrderSupplier(BaseModel):
    id: str
    name: str
    location: Location


class OrderDetailResponse(BaseModel):
    orderId: str
    status: OrderStatus
    partName: str | None = None
    partNumber: str | None = None
    urgency: Urgency
    buyer: OrderBuyer
    supplier: OrderSupplier | None = None
    deliveryLocation: Location
    partPrice: float | None = None
    pickTimeMinutes: int | None = None
    driveTimeMinutes: int | None = None
    totalTimeMinutes: int | None = None
    etaMinutesRemaining: int | None = None
    createdAt: str
    updatedAt: str
    deliveredAt: str | None = None
    estimatedDowntimeSaved: float | None = None


class OrderListItem(BaseModel):
    orderId: str
    status: OrderStatus
    partName: str | None = None
    partNumber: str | None = None
    urgency: Urgency
    buyerCompany: str
    supplierName: str | None = None
    distanceKm: float | None = None
    partPrice: float | None = None
    totalTimeMinutes: int | None = None
    etaMinutesRemaining: int | None = None
    acceptDeadlineMinutes: float | None = None
    createdAt: str
    updatedAt: str


class OrderListResponse(BaseModel):
    orders: list[OrderListItem]
    page: int
    pageSize: int
    total: int
