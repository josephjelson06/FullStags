"""Order action transitions endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.application.order_actions import run_order_action
from app.database import get_db
from app.deps.auth import get_current_user
from app.models import OrderActionRequest, OrderActionResponse

router = APIRouter(prefix="/api", tags=["order-actions"])


@router.patch("/orders/{order_id}", response_model=OrderActionResponse)
def order_action(
    order_id: str,
    body: OrderActionRequest,
    user: dict = Depends(get_current_user),
):
    with get_db() as conn:
        return run_order_action(conn, order_id, body.action, user, body.matchId)
