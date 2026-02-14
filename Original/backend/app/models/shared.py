"""Shared types and enums."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field

Role = Literal["buyer", "supplier", "admin"]
Urgency = Literal["critical", "high", "standard"]
OrderStatus = Literal[
    "matching", "pending_acceptance", "picking",
    "courier_to_supplier", "courier_to_factory", "delivered",
]
OrderAction = Literal[
    "select_supplier", "accept", "decline", "ready",
    "courier_picked_up", "delivered",
]
LegStatus = Literal["pending", "in_progress", "completed"]


class Location(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    address: str = Field(min_length=1, max_length=255)
