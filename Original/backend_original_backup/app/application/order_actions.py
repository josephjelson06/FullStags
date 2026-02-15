"""Application-layer orchestration for order actions."""

from __future__ import annotations

import sqlite3
from datetime import UTC, datetime

from fastapi import HTTPException

from app.config import DOWNTIME_COST_PER_MINUTE
from app.domain.order_state_machine import (
    ensure_known_action,
    ensure_role_allowed,
    ensure_transition_allowed,
)
from app.models import OrderActionResponse, SelectedSupplierInfo
from app.repositories import inventory_repo, order_repo


def _iso_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def run_order_action(
    conn: sqlite3.Connection,
    order_id: str,
    action: str,
    user: dict,
    match_id: str | None,
) -> OrderActionResponse:
    ensure_known_action(action)

    order = order_repo.find_order_by_id(conn, order_id)
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    ensure_transition_allowed(action, order["status"])
    ensure_role_allowed(action, user, order)

    now = _iso_now()

    if action == "select_supplier":
        selected = _handle_select_supplier(conn, order_id, order, match_id, now)
        return OrderActionResponse(
            orderId=order_id,
            status="pending_acceptance",
            selectedSupplier=selected,
            message="Order updated",
            updatedAt=now,
        )

    if action == "accept":
        _handle_accept(conn, order_id, order, now)
        return OrderActionResponse(
            orderId=order_id,
            status="picking",
            message="Order updated",
            updatedAt=now,
        )

    if action == "decline":
        _handle_decline(conn, order_id, order, now)
        return OrderActionResponse(
            orderId=order_id,
            status="matching",
            message="Order updated",
            updatedAt=now,
        )

    if action == "ready":
        order_repo.update_order_status(conn, order_id, "courier_to_supplier", now)
        order_repo.update_leg_status(conn, order_id, "Courier to Supplier", "in_progress")
        return OrderActionResponse(
            orderId=order_id,
            status="courier_to_supplier",
            message="Order updated",
            updatedAt=now,
        )

    if action == "courier_picked_up":
        order_repo.update_order_status(conn, order_id, "courier_to_factory", now)
        order_repo.update_leg_status(conn, order_id, "Courier to Supplier", "completed")
        order_repo.update_leg_status(conn, order_id, "Courier to Factory", "in_progress")
        return OrderActionResponse(
            orderId=order_id,
            status="courier_to_factory",
            message="Order updated",
            updatedAt=now,
        )

    if action == "delivered":
        total_fulfillment = order["total_time_minutes"]
        downtime_saved = round(total_fulfillment * DOWNTIME_COST_PER_MINUTE, 2) if total_fulfillment else None
        order_repo.mark_delivered(conn, order_id, now)
        order_repo.complete_all_legs(conn, order_id)
        return OrderActionResponse(
            orderId=order_id,
            status="delivered",
            message="Order updated",
            updatedAt=now,
            deliveredAt=now,
            totalFulfillmentMinutes=total_fulfillment,
            estimatedDowntimeSaved=downtime_saved,
        )

    raise HTTPException(status_code=400, detail=f"Unsupported action: {action}")


def _handle_select_supplier(
    conn: sqlite3.Connection,
    order_id: str,
    order: dict,
    match_id: str | None,
    now: str,
) -> SelectedSupplierInfo:
    if not match_id:
        raise HTTPException(status_code=422, detail="matchId is required when action is select_supplier")
    if order["selected_match_id"]:
        raise HTTPException(status_code=409, detail="Order already locked by another supplier selection")

    match = order_repo.find_match_by_id(conn, match_id, order_id)
    if not match:
        raise HTTPException(status_code=404, detail="Match not found")

    order_repo.update_order_supplier_selection(
        conn,
        order_id,
        match["supplier_id"],
        match["id"],
        match["part_price"],
        match["pick_time_minutes"],
        match["drive_time_minutes"],
        match["total_time_minutes"],
        now,
    )
    order_repo.create_legs(conn, order_id)

    return SelectedSupplierInfo(
        supplierId=match["supplier_id"],
        supplierName=match["supplier_name"],
        totalTimeMinutes=match["total_time_minutes"],
    )


def _handle_accept(conn: sqlite3.Connection, order_id: str, order: dict, now: str) -> None:
    if order["selected_match_id"]:
        match = order_repo.find_match_by_id(conn, order["selected_match_id"], order_id)
        if match:
            col = "part_number" if order["part_number"] else "part_name"
            val = order["part_number"] or order["part_name"]
            item = inventory_repo.find_by_supplier_and_part(conn, match["supplier_id"], val) if col == "part_number" else None
            if item:
                full_item = inventory_repo.find_by_id(conn, item["id"])
                if full_item and full_item["quantity"] <= 0:
                    raise HTTPException(status_code=409, detail="Insufficient inventory quantity to accept this order")
            order_repo.decrement_inventory(conn, match["supplier_id"], col, val)

    order_repo.update_order_status(conn, order_id, "picking", now)


def _handle_decline(conn: sqlite3.Connection, order_id: str, order: dict, now: str) -> None:
    order_repo.reset_order_to_matching(conn, order_id, now)
    if order["selected_match_id"]:
        order_repo.decline_match(conn, order["selected_match_id"])
    order_repo.delete_legs(conn, order_id)
