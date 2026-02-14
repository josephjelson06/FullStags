"""Supplier profile schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field


class UpdatePickTimeRequest(BaseModel):
    pickTimeMinutes: int = Field(ge=1, le=240)


class PickTimeResponse(BaseModel):
    supplierId: str
    pickTimeMinutes: int
    updatedAt: str
