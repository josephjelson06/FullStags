import json
from typing import List

from backend.database import AsyncSessionLocal
from backend.events.handlers import handle_event
from backend.models.events import EventLog


async def emit_event(event_type: str, payload: dict, target_user_ids: List[int]) -> None:
    """Persist event log entry and dispatch integration handlers."""
    event_payload = dict(payload or {})
    event_payload["target_user_ids"] = target_user_ids

    async with AsyncSessionLocal() as session:
        session.add(
            EventLog(
                event_type=event_type,
                entity_type=event_payload.get("entity_type"),
                entity_id=event_payload.get("entity_id"),
                payload=json.dumps(event_payload),
            )
        )
        await session.commit()

    await handle_event(event_type, event_payload, target_user_ids)
