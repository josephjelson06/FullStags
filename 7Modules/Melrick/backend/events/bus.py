from __future__ import annotations

import json
import logging
from typing import Dict, List

from ..database import AsyncSessionLocal
from ..models.notifications import EventLog

logger = logging.getLogger(__name__)
_socket_server = None


def init_socket_server(sio) -> None:
    global _socket_server
    _socket_server = sio


async def _dispatch_integration_handlers(event_type: str, payload: Dict, target_user_ids: List[int]) -> None:
    try:
        from .handlers import dispatch_event

        await dispatch_event(event_type=event_type, payload=payload, target_user_ids=target_user_ids)
    except Exception:
        logger.exception("Failed to dispatch event handlers for %s", event_type)


async def emit_event(event_type: str, payload: Dict, target_user_ids: List[int]) -> None:
    event_payload = dict(payload)
    event_payload["target_user_ids"] = target_user_ids

    async with AsyncSessionLocal() as session:
        session.add(
            EventLog(
                event_type=event_type,
                entity_type=payload.get("entity_type"),
                entity_id=payload.get("entity_id"),
                payload=json.dumps(event_payload),
            )
        )
        await session.commit()

    if _socket_server is not None:
        try:
            await _socket_server.emit("event", {"event_type": event_type, "payload": event_payload})
        except Exception:
            logger.exception("Failed to emit socket event")

    await _dispatch_integration_handlers(event_type, event_payload, target_user_ids)
