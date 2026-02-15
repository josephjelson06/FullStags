"""Domain rules for order state transitions and role policies."""

from __future__ import annotations

from fastapi import HTTPException

TRANSITIONS: dict[str, tuple[str, str]] = {
    "select_supplier": ("matching", "pending_acceptance"),
    "accept": ("pending_acceptance", "picking"),
    "decline": ("pending_acceptance", "matching"),
    "ready": ("picking", "courier_to_supplier"),
    "courier_picked_up": ("courier_to_supplier", "courier_to_factory"),
    "delivered": ("courier_to_factory", "delivered"),
}


def ensure_known_action(action: str) -> None:
    if action not in TRANSITIONS:
        raise HTTPException(status_code=400, detail=f"Unknown action: {action}")


def ensure_transition_allowed(action: str, current_status: str) -> str:
    required_status, new_status = TRANSITIONS[action]
    if current_status != required_status:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid transition: {action} requires status {required_status}",
        )
    return new_status


def ensure_role_allowed(action: str, user: dict, order: dict) -> None:
    role = user["role"]

    if action == "select_supplier":
        if role not in ("buyer", "admin"):
            raise HTTPException(status_code=403, detail="User role not allowed for this action")
        if role == "buyer" and order["buyer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="User role not allowed for this action")
        return

    if action in ("accept", "decline", "ready"):
        if role not in ("supplier", "admin"):
            raise HTTPException(status_code=403, detail="User role not allowed for this action")
        if role == "supplier" and order["selected_supplier_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="User role not allowed for this action")
        return

    if action == "courier_picked_up":
        if role != "admin":
            raise HTTPException(status_code=403, detail="User role not allowed for this action")
        return

    if action == "delivered" and role not in ("buyer", "admin"):
        raise HTTPException(status_code=403, detail="User role not allowed for this action")
