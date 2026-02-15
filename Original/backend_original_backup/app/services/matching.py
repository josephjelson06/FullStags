"""Supplier matching business logic."""

from __future__ import annotations

from app.config import AVERAGE_SPEED_KMPH
from app.services.geo import haversine


def compute_matches(
    order: dict,
    suppliers_with_inventory: list[dict],
) -> list[dict]:
    """Compute ranked match list for an order.

    Each supplier dict must contain:
      id, name, lat, lng, address, pick_time_minutes, part_price, stock_quantity.

    Returns list of match dicts sorted by totalTimeMinutes ascending.
    """
    results: list[dict] = []
    urgency = order["urgency"]

    for sup in suppliers_with_inventory:
        distance_km = round(
            haversine(order["delivery_lat"], order["delivery_lng"], sup["lat"], sup["lng"]),
            2,
        )
        drive_time = int(round((distance_km / AVERAGE_SPEED_KMPH) * 60))
        pick_time = sup["pick_time_minutes"]
        total_time = pick_time + drive_time

        # Urgency cutoffs
        if urgency == "critical" and total_time > 120:
            continue
        if urgency == "high" and total_time > 360:
            continue

        results.append({
            "supplier_id": sup["id"],
            "supplier_name": sup["name"],
            "distance_km": distance_km,
            "pick_time_minutes": pick_time,
            "drive_time_minutes": drive_time,
            "total_time_minutes": total_time,
            "part_price": sup["part_price"],
            "supplier_lat": sup["lat"],
            "supplier_lng": sup["lng"],
            "supplier_address": sup["address"],
        })

    results.sort(key=lambda m: m["total_time_minutes"])
    return results[:10]