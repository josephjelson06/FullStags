import json
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from backend.database import AsyncSessionLocal
from backend.events.handlers import prepare_event
from backend.models.events import EventLog, Notification

sio_server: Optional[Any] = None


async def emit_event(event_type: str, payload: Dict[str, Any], target_user_ids: List[int]):
    async with AsyncSessionLocal() as session:
        event_result = await prepare_event(session, event_type, payload, target_user_ids)
        now_iso = datetime.now(timezone.utc).isoformat()

        notifications_by_user: dict[int, Notification] = {}

        event = EventLog(
            event_type=event_type,
            entity_type=event_result.metadata.get("entity_type"),
            entity_id=event_result.metadata.get("entity_id"),
            payload=json.dumps(event_result.metadata),
        )
        session.add(event)
        for user_id in event_result.target_user_ids:
            notification = Notification(
                user_id=user_id,
                event_type=event_type,
                title=event_result.title,
                message=event_result.message,
                metadata_json=json.dumps(event_result.metadata),
            )
            session.add(notification)
            notifications_by_user[user_id] = notification

        await session.flush()
        await session.commit()

    notification_ids = [
        notifications_by_user[user_id].id
        for user_id in event_result.target_user_ids
        if user_id in notifications_by_user and notifications_by_user[user_id].id is not None
    ]
    result_payload = {
        "event_id": event.id,
        "event_type": event_type,
        "title": event_result.title,
        "message": event_result.message,
        "metadata": event_result.metadata,
        "timestamp": now_iso,
        "target_user_ids": event_result.target_user_ids,
        "notification_ids": notification_ids,
        "notifications_created": len(notification_ids),
    }

    if sio_server is not None:
        event_payload = {
            "event_type": event_type,
            "title": event_result.title,
            "message": event_result.message,
            "metadata": event_result.metadata,
            "timestamp": now_iso,
            "target_user_ids": event_result.target_user_ids,
        }

        for user_id in event_result.target_user_ids:
            notification = notifications_by_user.get(user_id)
            created_at = notification.created_at.isoformat() if notification and notification.created_at else now_iso
            notification_payload = {
                **event_payload,
                "notification_id": notification.id if notification else None,
                "user_id": user_id,
                "is_read": False,
                "created_at": created_at,
            }
            await sio_server.emit(
                "notification",
                notification_payload,
                room=f"user_{user_id}",
            )

        await sio_server.emit("system_event", event_payload, room="role_admin")

    return result_payload
