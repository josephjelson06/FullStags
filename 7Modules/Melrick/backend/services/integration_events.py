from __future__ import annotations

from typing import Dict, Iterable, List, Optional

from ..events.bus import emit_event


def _compact_user_ids(user_ids: Iterable[Optional[int]]) -> List[int]:
    compacted = []
    for user_id in user_ids:
        if user_id is None:
            continue
        compacted.append(int(user_id))
    return list(dict.fromkeys(compacted))


async def emit_order_status_event(
    event_type: str,
    order_id: int,
    buyer_user_id: Optional[int],
    supplier_user_ids: Optional[Iterable[int]] = None,
    payload: Optional[Dict] = None,
) -> None:
    event_payload = {
        "entity_type": "order",
        "entity_id": order_id,
        "order_id": order_id,
    }
    if payload:
        event_payload.update(payload)

    await emit_event(
        event_type=event_type,
        payload=event_payload,
        target_user_ids=_compact_user_ids([buyer_user_id, *(supplier_user_ids or [])]),
    )


async def emit_low_stock_alert(
    supplier_user_id: int,
    catalog_id: int,
    current_quantity: int,
    threshold_quantity: int,
    part_number: Optional[str] = None,
) -> None:
    await emit_event(
        event_type="LOW_STOCK_ALERT",
        payload={
            "entity_type": "parts_catalog",
            "entity_id": catalog_id,
            "catalog_id": catalog_id,
            "part_number": part_number,
            "current_quantity": current_quantity,
            "threshold_quantity": threshold_quantity,
        },
        target_user_ids=_compact_user_ids([supplier_user_id]),
    )
