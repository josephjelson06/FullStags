"""Order CRUD endpoints — create, list, detail, matches."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query

from app.database import get_db
from app.deps.auth import get_current_user, require_role
from app.models import (
    CreateOrderRequest,
    Location,
    MatchResponse,
    OrderBuyer,
    OrderDetailResponse,
    OrderListItem,
    OrderListResponse,
    OrderMatchesResponse,
    OrderSupplier,
)
from app.repositories import order_repo
from app.services.matching import compute_matches

router = APIRouter(prefix="/api", tags=["orders"])

ACTIVE_STATUSES = ("matching", "pending_acceptance", "picking", "courier_to_supplier", "courier_to_factory")


def _iso_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _eta_remaining(order: dict) -> int:
    if order["total_time_minutes"] is None:
        return 0
    created = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00"))
    elapsed = (datetime.now(UTC) - created).total_seconds() / 60
    return max(0, int(order["total_time_minutes"] - elapsed))


# ──── B1: Create order ────
@router.post("/orders", status_code=201)
def create_order(body: CreateOrderRequest, user: dict = Depends(require_role("buyer"))):
    if not body.partName and not body.partNumber:
        raise HTTPException(status_code=422, detail="Either partName or partNumber is required")

    now = _iso_now()
    order_id = f"ord_{uuid4().hex[:6]}"

    with get_db() as conn:
        order_repo.create_order(
            conn, order_id, user["id"],
            body.partName.strip() if body.partName else None,
            body.partNumber.strip() if body.partNumber else None,
            body.urgency,
            body.deliveryLocation.lat, body.deliveryLocation.lng,
            body.deliveryLocation.address.strip(), now,
        )

        # Run matching
        search_col = "part_number" if body.partNumber else "part_name"
        search_val = (body.partNumber.strip() if body.partNumber else body.partName.strip())
        supplier_rows = order_repo.find_suppliers_with_inventory(conn, search_col, search_val)

        order_dict = {"delivery_lat": body.deliveryLocation.lat, "delivery_lng": body.deliveryLocation.lng, "urgency": body.urgency}
        matches = compute_matches(order_dict, supplier_rows)

        for m in matches:
            order_repo.insert_match(
                conn, f"match_{uuid4().hex[:6]}", order_id,
                m["supplier_id"], m["supplier_name"], m["distance_km"],
                m["pick_time_minutes"], m["drive_time_minutes"], m["total_time_minutes"],
                m["part_price"], m["supplier_lat"], m["supplier_lng"], m["supplier_address"],
            )

    return {
        "orderId": order_id, "status": "matching",
        "partName": body.partName, "partNumber": body.partNumber,
        "urgency": body.urgency,
        "deliveryLocation": {"lat": body.deliveryLocation.lat, "lng": body.deliveryLocation.lng, "address": body.deliveryLocation.address},
        "createdAt": now,
    }


# ──── B2: Get matches ────
@router.get("/orders/{order_id}/matches", response_model=OrderMatchesResponse)
def get_matches(order_id: str, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        order = order_repo.find_order_by_id(conn, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if user["role"] == "buyer" and order["buyer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You are not allowed to view matches for this order")
        if user["role"] == "supplier":
            raise HTTPException(status_code=403, detail="You are not allowed to view matches for this order")
        if order["status"] != "matching":
            raise HTTPException(status_code=409, detail="Matches not available for current order status")

        rows = order_repo.find_matches_for_order(conn, order_id)

    return OrderMatchesResponse(
        orderId=order_id,
        matches=[
            MatchResponse(
                matchId=r["id"], supplierId=r["supplier_id"], supplierName=r["supplier_name"],
                distanceKm=r["distance_km"], pickTimeMinutes=r["pick_time_minutes"],
                driveTimeMinutes=r["drive_time_minutes"], totalTimeMinutes=r["total_time_minutes"],
                partPrice=r["part_price"],
                supplierLocation=Location(lat=r["supplier_lat"], lng=r["supplier_lng"], address=r["supplier_address"]),
            )
            for r in rows
        ],
    )


# ──── B4: Order detail ────
@router.get("/orders/{order_id}", response_model=OrderDetailResponse)
def get_order_detail(order_id: str, user: dict = Depends(get_current_user)):
    with get_db() as conn:
        order = order_repo.find_order_by_id(conn, order_id)
        if not order:
            raise HTTPException(status_code=404, detail="Order not found")

        if user["role"] == "buyer" and order["buyer_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You are not allowed to view this order")
        if user["role"] == "supplier" and order["selected_supplier_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You are not allowed to view this order")

        from app.repositories import user_repo
        buyer_row = user_repo.find_by_id(conn, order["buyer_id"])
        buyer = OrderBuyer(id=buyer_row["id"], name=buyer_row["name"], companyName=buyer_row["company_name"])

        supplier = None
        if order["selected_supplier_id"]:
            sup_row = user_repo.find_by_id(conn, order["selected_supplier_id"])
            if sup_row:
                supplier = OrderSupplier(
                    id=sup_row["id"], name=sup_row["name"],
                    location=Location(lat=sup_row["lat"], lng=sup_row["lng"], address=sup_row["address"]),
                )

    eta_remaining = _eta_remaining(order) if order["status"] in ACTIVE_STATUSES else None
    from app.config import DOWNTIME_COST_PER_MINUTE
    downtime_saved = round(order["total_time_minutes"] * DOWNTIME_COST_PER_MINUTE, 2) if order["delivered_at"] and order["total_time_minutes"] else None

    return OrderDetailResponse(
        orderId=order["id"], status=order["status"],
        partName=order["part_name"], partNumber=order["part_number"],
        urgency=order["urgency"], buyer=buyer, supplier=supplier,
        deliveryLocation=Location(lat=order["delivery_lat"], lng=order["delivery_lng"], address=order["delivery_address"]),
        partPrice=order["part_price"], pickTimeMinutes=order["pick_time_minutes"],
        driveTimeMinutes=order["drive_time_minutes"], totalTimeMinutes=order["total_time_minutes"],
        etaMinutesRemaining=eta_remaining,
        createdAt=order["created_at"], updatedAt=order["updated_at"],
        deliveredAt=order["delivered_at"], estimatedDowntimeSaved=downtime_saved,
    )


# ──── B5: List orders ────
@router.get("/orders", response_model=OrderListResponse)
def list_orders(
    status: str | None = Query(default=None),
    urgency: str | None = Query(default=None),
    page: int = Query(default=1, ge=1),
    pageSize: int = Query(default=20, ge=1, le=100),
    user: dict = Depends(get_current_user),
):
    clauses: list[str] = []
    params: list = []

    if user["role"] == "buyer":
        clauses.append("o.buyer_id = ?")
        params.append(user["id"])
    elif user["role"] == "supplier":
        clauses.append("(o.selected_supplier_id = ? OR o.status = 'pending_acceptance')")
        params.append(user["id"])

    if status:
        if status == "active":
            clauses.append("o.status IN ('matching','pending_acceptance','picking','courier_to_supplier','courier_to_factory')")
        elif status == "pending":
            clauses.append("o.status = 'pending_acceptance'")
        elif status == "delivered":
            clauses.append("o.status = 'delivered'")
        elif status != "all":
            clauses.append("o.status = ?")
            params.append(status)

    if urgency:
        clauses.append("o.urgency = ?")
        params.append(urgency)

    where = (" WHERE " + " AND ".join(clauses)) if clauses else ""
    offset = (page - 1) * pageSize

    with get_db() as conn:
        total = order_repo.count_orders(conn, where, params)
        rows = order_repo.list_orders(conn, where, params, pageSize, offset)
        order_ids = [r["id"] for r in rows]
        distances = order_repo.get_selected_match_distance(conn, order_ids)

    items: list[OrderListItem] = []
    for r in rows:
        eta = _eta_remaining(r) if r["status"] in ACTIVE_STATUSES else None
        accept_deadline = None
        if r["status"] == "pending_acceptance":
            updated = datetime.fromisoformat(r["updated_at"].replace("Z", "+00:00"))
            elapsed = (datetime.now(UTC) - updated).total_seconds() / 60
            accept_deadline = round(max(0, 5.0 - elapsed), 1)

        items.append(OrderListItem(
            orderId=r["id"], status=r["status"], partName=r["part_name"],
            partNumber=r["part_number"], urgency=r["urgency"],
            buyerCompany=r["buyer_company"], supplierName=r.get("supplier_name_val"),
            distanceKm=distances.get(r["id"]), partPrice=r["part_price"],
            totalTimeMinutes=r["total_time_minutes"], etaMinutesRemaining=eta,
            acceptDeadlineMinutes=accept_deadline,
            createdAt=r["created_at"], updatedAt=r["updated_at"],
        ))

    return OrderListResponse(orders=items, page=page, pageSize=pageSize, total=total)