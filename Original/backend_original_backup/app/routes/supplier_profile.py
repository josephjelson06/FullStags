"""Supplier profile — pick time SLA."""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends

from app.database import get_db
from app.deps.auth import require_role
from app.models import PickTimeResponse, UpdatePickTimeRequest
from app.repositories import user_repo

router = APIRouter(prefix="/api", tags=["supplier-profile"])


def _iso_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@router.patch("/suppliers/me", response_model=PickTimeResponse)
def update_pick_time(body: UpdatePickTimeRequest, user: dict = Depends(require_role("supplier"))):
    with get_db() as conn:
        user_repo.update_pick_time(conn, user["id"], body.pickTimeMinutes)

    return PickTimeResponse(
        supplierId=user["id"],
        pickTimeMinutes=body.pickTimeMinutes,
        updatedAt=_iso_now(),
    )
