from __future__ import annotations

import json
import logging
import math
import os
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import httpx
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..events.bus import emit_event
from ..models.inventory import PartsCatalog
from ..models.matching import MatchingLog
from ..models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from ..models.users import BuyerProfile, SupplierProfile

logger = logging.getLogger(__name__)

DEFAULT_WEIGHT_PROFILES = {
    "standard": {"distance": 0.20, "reliability": 0.25, "price": 0.35, "urgency": 0.20},
    "urgent": {"distance": 0.30, "reliability": 0.25, "price": 0.15, "urgency": 0.30},
    "critical": {"distance": 0.35, "reliability": 0.20, "price": 0.10, "urgency": 0.35},
}

WEIGHT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "config" / "matching_weights.json"

ORS_MATRIX_URL = "https://api.openrouteservice.org/v2/matrix/driving-car"


@dataclass
class SupplierCandidate:
    supplier: SupplierProfile
    catalog: PartsCatalog
    distance_km: float = 0.0


@dataclass
class ScoredCandidate:
    supplier_id: int
    business_name: str
    catalog: PartsCatalog
    distance_km: float
    distance_score: float
    reliability_score: float
    price_score: float
    urgency_score: float
    total_score: float


def normalize_part_number(part_number: str) -> str:
    if not part_number:
        return ""
    cleaned = "".join(ch for ch in part_number.strip().upper() if ch.isalnum())
    return cleaned


def _ensure_weight_file() -> None:
    if WEIGHT_CONFIG_PATH.exists():
        return
    WEIGHT_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with WEIGHT_CONFIG_PATH.open("w", encoding="utf-8") as handle:
        json.dump(DEFAULT_WEIGHT_PROFILES, handle, indent=2)


def load_weight_profiles() -> Dict[str, Dict[str, float]]:
    _ensure_weight_file()
    with WEIGHT_CONFIG_PATH.open("r", encoding="utf-8") as handle:
        data = json.load(handle)
    merged = dict(DEFAULT_WEIGHT_PROFILES)
    merged.update(data)
    return merged


def save_weight_profiles(weight_profiles: Dict[str, Dict[str, float]]) -> None:
    WEIGHT_CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with WEIGHT_CONFIG_PATH.open("w", encoding="utf-8") as handle:
        json.dump(weight_profiles, handle, indent=2)


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = math.sin(delta_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius * c


async def find_eligible_suppliers(
    session: AsyncSession, order_item: OrderItem, buyer_profile: BuyerProfile
) -> List[SupplierCandidate]:
    normalized = normalize_part_number(order_item.part_number)

    query = (
        select(PartsCatalog, SupplierProfile)
        .join(SupplierProfile, PartsCatalog.supplier_id == SupplierProfile.id)
        .where(
            PartsCatalog.normalized_part_number == normalized,
            PartsCatalog.quantity_in_stock >= order_item.quantity,
        )
    )
    result = await session.execute(query)
    rows = result.all()

    candidates: List[SupplierCandidate] = []
    for catalog, supplier in rows:
        distance_km = haversine_km(
            buyer_profile.latitude,
            buyer_profile.longitude,
            supplier.latitude,
            supplier.longitude,
        )
        candidates.append(SupplierCandidate(supplier=supplier, catalog=catalog, distance_km=distance_km))

    if not candidates:
        return []

    filtered = [c for c in candidates if c.distance_km <= (c.supplier.service_radius_km or 0)]
    if filtered:
        return filtered

    for radius in range(50, 501, 50):
        expanded = [
            c
            for c in candidates
            if c.distance_km <= max(radius, c.supplier.service_radius_km or 0)
        ]
        logger.info("Expanding search radius to %skm (found %s candidates)", radius, len(expanded))
        if expanded:
            return expanded

    return []


async def compute_distance_batch(
    buyer_coords: Tuple[float, float],
    candidates: List[SupplierCandidate],
) -> Dict[int, float]:
    if not candidates:
        return {}

    locations = [[buyer_coords[1], buyer_coords[0]]]
    for candidate in candidates:
        locations.append([candidate.supplier.longitude, candidate.supplier.latitude])

    payload = {
        "locations": locations,
        "sources": [0],
        "destinations": list(range(1, len(locations))),
        "metrics": ["distance"],
    }

    ors_api_key = os.getenv("ORS_API_KEY")
    if not ors_api_key:
        logger.warning("ORS_API_KEY not set. Falling back to Haversine distances.")
        return {
            candidate.supplier.id: haversine_km(
                buyer_coords[0],
                buyer_coords[1],
                candidate.supplier.latitude,
                candidate.supplier.longitude,
            )
            * 1.3
            for candidate in candidates
        }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                ORS_MATRIX_URL,
                json=payload,
                headers={"Authorization": ors_api_key},
            )
            response.raise_for_status()
            data = response.json()

        distances = data.get("distances", [])
        if not distances or not distances[0]:
            raise ValueError("Empty distance matrix")

        distance_values = distances[0]
        results: Dict[int, float] = {}
        for idx, candidate in enumerate(candidates):
            dist_meters = distance_values[idx]
            results[candidate.supplier.id] = (dist_meters or 0) / 1000
        return results
    except Exception:
        logger.exception("ORS matrix call failed. Falling back to Haversine distances.")
        return {
            candidate.supplier.id: haversine_km(
                buyer_coords[0],
                buyer_coords[1],
                candidate.supplier.latitude,
                candidate.supplier.longitude,
            )
            * 1.3
            for candidate in candidates
        }


def _compute_urgency_score(
    order: Order,
    distance_km: float,
    lead_time_hours: float,
) -> float:
    now = datetime.now(timezone.utc)
    if order.required_delivery_date:
        required = order.required_delivery_date
        if required.tzinfo is None:
            required = required.replace(tzinfo=timezone.utc)
        hours_available = (required - now).total_seconds() / 3600
    else:
        hours_available = 168.0

    hours_available -= distance_km / 50
    if hours_available <= 0:
        return 0.0
    if lead_time_hours > hours_available:
        return 0.0
    return max(0.0, min(1.0, 1 - (lead_time_hours / hours_available)))


def score_candidates(
    order: Order,
    order_item: OrderItem,
    candidates: List[SupplierCandidate],
    distance_map: Dict[int, float],
    weights: Dict[str, float],
) -> List[ScoredCandidate]:
    if not candidates:
        return []

    if len(candidates) == 1:
        max_distance = 500.0
    else:
        max_distance = max(distance_map.get(c.supplier.id, c.distance_km) for c in candidates) or 1.0

    max_price = max(c.catalog.unit_price for c in candidates) or 1.0

    scored: List[ScoredCandidate] = []
    for candidate in candidates:
        distance_km = distance_map.get(candidate.supplier.id, candidate.distance_km)
        distance_score = max(0.0, min(1.0, (max_distance - distance_km) / max_distance))
        reliability_score = max(0.0, min(1.0, candidate.supplier.reliability_score or 0.0))
        price_score = max(0.0, min(1.0, (max_price - candidate.catalog.unit_price) / max_price))
        urgency_score = _compute_urgency_score(order, distance_km, candidate.catalog.lead_time_hours)

        total_score = (
            weights["distance"] * distance_score
            + weights["reliability"] * reliability_score
            + weights["price"] * price_score
            + weights["urgency"] * urgency_score
        )

        scored.append(
            ScoredCandidate(
                supplier_id=candidate.supplier.id,
                business_name=candidate.supplier.business_name,
                catalog=candidate.catalog,
                distance_km=distance_km,
                distance_score=distance_score,
                reliability_score=reliability_score,
                price_score=price_score,
                urgency_score=urgency_score,
                total_score=total_score,
            )
        )

    return scored


def apply_single_supplier_bonus(
    per_item_scores: Dict[int, List[ScoredCandidate]]
) -> None:
    if not per_item_scores:
        return

    supplier_sets = [
        {candidate.supplier_id for candidate in candidates}
        for candidates in per_item_scores.values()
        if candidates
    ]
    if not supplier_sets:
        return

    common_suppliers = set.intersection(*supplier_sets)
    if not common_suppliers:
        return

    for candidates in per_item_scores.values():
        for candidate in candidates:
            if candidate.supplier_id in common_suppliers:
                candidate.total_score = min(1.0, candidate.total_score + 0.10)


def _rank_candidates(candidates: List[ScoredCandidate]) -> List[ScoredCandidate]:
    return sorted(candidates, key=lambda c: c.total_score, reverse=True)


def _to_match_result(order_item_id: int, candidates: List[ScoredCandidate]) -> Dict:
    ranked = _rank_candidates(candidates)
    top_matches = [
        {
            "supplier_id": c.supplier_id,
            "business_name": c.business_name,
            "distance_km": c.distance_km,
            "distance_score": c.distance_score,
            "reliability_score": c.reliability_score,
            "price_score": c.price_score,
            "urgency_score": c.urgency_score,
            "total_score": c.total_score,
            "catalog_entry": {
                "id": c.catalog.id,
                "supplier_id": c.catalog.supplier_id,
                "category_id": c.catalog.category_id,
                "part_name": c.catalog.part_name,
                "part_number": c.catalog.part_number,
                "brand": c.catalog.brand,
                "unit_price": c.catalog.unit_price,
                "quantity_in_stock": c.catalog.quantity_in_stock,
                "lead_time_hours": c.catalog.lead_time_hours,
            },
        }
        for c in ranked[:3]
    ]
    selected_supplier_id = ranked[0].supplier_id if ranked else None
    return {
        "order_item_id": order_item_id,
        "top_matches": top_matches,
        "selected_supplier_id": selected_supplier_id,
    }


async def _log_matching(
    session: AsyncSession, order_item_id: int, candidates: List[ScoredCandidate]
) -> None:
    await session.execute(delete(MatchingLog).where(MatchingLog.order_item_id == order_item_id))
    ranked = _rank_candidates(candidates)
    for rank, candidate in enumerate(ranked, start=1):
        session.add(
            MatchingLog(
                order_item_id=order_item_id,
                supplier_id=candidate.supplier_id,
                distance_km=candidate.distance_km,
                distance_score=candidate.distance_score,
                reliability_score=candidate.reliability_score,
                price_score=candidate.price_score,
                urgency_score=candidate.urgency_score,
                total_score=candidate.total_score,
                rank=rank,
            )
        )


async def match_order_item(
    session: AsyncSession,
    order_item_id: int,
    simulate: bool = False,
) -> Dict:
    item_result = await session.execute(select(OrderItem).where(OrderItem.id == order_item_id))
    order_item = item_result.scalar_one_or_none()
    if not order_item:
        raise ValueError("Order item not found")

    order_result = await session.execute(select(Order).where(Order.id == order_item.order_id))
    order = order_result.scalar_one()

    buyer_result = await session.execute(select(BuyerProfile).where(BuyerProfile.id == order.buyer_id))
    buyer_profile = buyer_result.scalar_one()

    candidates = await find_eligible_suppliers(session, order_item, buyer_profile)
    if not candidates:
        if not simulate:
            await _log_matching(session, order_item_id, [])
            await session.commit()
        return {"order_item_id": order_item_id, "top_matches": [], "selected_supplier_id": None}

    distance_map = await compute_distance_batch(
        (buyer_profile.latitude, buyer_profile.longitude),
        candidates,
    )
    weights = load_weight_profiles().get(order.urgency, DEFAULT_WEIGHT_PROFILES["standard"])
    scored = score_candidates(order, order_item, candidates, distance_map, weights)

    if not simulate:
        await _log_matching(session, order_item_id, scored)
        await session.commit()

    return _to_match_result(order_item_id, scored)


async def match_full_order(
    session: AsyncSession,
    order_id: int,
    simulate: bool = False,
    changed_by_user_id: Optional[int] = None,
) -> List[Dict]:
    order_result = await session.execute(select(Order).where(Order.id == order_id))
    order = order_result.scalar_one_or_none()
    if not order:
        raise ValueError("Order not found")

    buyer_result = await session.execute(select(BuyerProfile).where(BuyerProfile.id == order.buyer_id))
    buyer_profile = buyer_result.scalar_one()

    items_result = await session.execute(select(OrderItem).where(OrderItem.order_id == order_id))
    items = items_result.scalars().all()

    weight_profiles = load_weight_profiles()
    per_item_scores: Dict[int, List[ScoredCandidate]] = {}

    for item in items:
        candidates = await find_eligible_suppliers(session, item, buyer_profile)
        if not candidates:
            per_item_scores[item.id] = []
            continue
        distance_map = await compute_distance_batch(
            (buyer_profile.latitude, buyer_profile.longitude),
            candidates,
        )
        weights = weight_profiles.get(order.urgency, DEFAULT_WEIGHT_PROFILES["standard"])
        per_item_scores[item.id] = score_candidates(order, item, candidates, distance_map, weights)

    apply_single_supplier_bonus(per_item_scores)

    results: List[Dict] = []
    for item_id, candidates in per_item_scores.items():
        results.append(_to_match_result(item_id, candidates))

    if simulate:
        return results

    for item_id, candidates in per_item_scores.items():
        await _log_matching(session, item_id, candidates)

    for item in items:
        candidates = _rank_candidates(per_item_scores.get(item.id, []))
        if not candidates:
            continue
        top_candidate = candidates[0]

        existing_result = await session.execute(
            select(OrderAssignment).where(OrderAssignment.order_item_id == item.id)
        )
        existing_assignments = existing_result.scalars().all()
        if any(a.status in {"ACCEPTED", "FULFILLED"} for a in existing_assignments):
            continue
        if existing_assignments:
            await session.execute(delete(OrderAssignment).where(OrderAssignment.order_item_id == item.id))

        session.add(
            OrderAssignment(
                order_item_id=item.id,
                supplier_id=top_candidate.supplier_id,
                catalog_id=top_candidate.catalog.id,
                assigned_price=top_candidate.catalog.unit_price,
                match_score=top_candidate.total_score,
                status="PROPOSED",
            )
        )

        previous_item_status = item.status
        item.status = "MATCHED"
        session.add(
            OrderStatusHistory(
                order_id=order_id,
                order_item_id=item.id,
                from_status=previous_item_status,
                to_status="MATCHED",
                changed_by=changed_by_user_id,
            )
        )

    previous_order_status = order.status
    order.status = "MATCHED"
    session.add(
        OrderStatusHistory(
            order_id=order_id,
            order_item_id=None,
            from_status=previous_order_status,
            to_status="MATCHED",
            changed_by=changed_by_user_id,
        )
    )

    await session.commit()

    supplier_ids = {
        assignment.supplier_id
        for assignment in (
            await session.execute(select(OrderAssignment).where(OrderAssignment.order_item_id.in_([i.id for i in items])))
        ).scalars()
    }

    target_user_ids: List[int] = []
    if buyer_profile.user_id:
        target_user_ids.append(buyer_profile.user_id)

    if supplier_ids:
        supplier_result = await session.execute(
            select(SupplierProfile).where(SupplierProfile.id.in_(supplier_ids))
        )
        for supplier in supplier_result.scalars().all():
            if supplier.user_id:
                target_user_ids.append(supplier.user_id)
    # Remove duplicates before event dispatch.
    target_user_ids = list(set(target_user_ids))

    await emit_event(
        "SUPPLIER_MATCHED",
        {
            "entity_type": "order",
            "entity_id": order_id,
            "order_id": order_id,
            "order_item_ids": [item.id for item in items],
        },
        target_user_ids,
    )

    return results
