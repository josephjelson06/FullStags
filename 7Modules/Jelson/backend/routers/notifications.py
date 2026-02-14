import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from backend.database import get_db
from backend.events.bus import emit_event
from backend.middleware.auth import RoleChecker, get_current_user
from backend.models.events import EventLog, Notification
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.schemas.notifications import (
    EventLifecycleTestRequest,
    EventLifecycleTestResponse,
    EventLogListResponse,
    EventLogResponse,
    EventTestContextResponse,
    EventTestContextUser,
    EventTestEmitRequest,
    EventTestEmitResponse,
    MarkAllReadResponse,
    NotificationListResponse,
    NotificationResponse,
    UnreadCountResponse,
)

notifications_router = APIRouter(prefix="/api/notifications", tags=["notifications"])
events_router = APIRouter(prefix="/api/events", tags=["events"])


def _parse_json(value: str | None) -> dict | None:
    if not value:
        return None
    try:
        loaded = json.loads(value)
    except json.JSONDecodeError:
        return None
    return loaded if isinstance(loaded, dict) else None


def _notification_to_response(notification: Notification) -> NotificationResponse:
    return NotificationResponse(
        id=notification.id,
        user_id=notification.user_id,
        event_type=notification.event_type,
        title=notification.title,
        message=notification.message,
        is_read=notification.is_read,
        metadata=_parse_json(notification.metadata_json),
        created_at=notification.created_at,
    )


@notifications_router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    is_read: bool | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    filters = [Notification.user_id == current_user.id]
    if is_read is not None:
        filters.append(Notification.is_read == is_read)

    count_result = await db.execute(select(func.count(Notification.id)).where(*filters))
    total = int(count_result.scalar() or 0)

    result = await db.execute(
        select(Notification)
        .where(*filters)
        .order_by(Notification.created_at.desc(), Notification.id.desc())
        .limit(limit)
        .offset(offset)
    )
    notifications = result.scalars().all()

    return NotificationListResponse(
        items=[_notification_to_response(item) for item in notifications],
        limit=limit,
        offset=offset,
        total=total,
    )


@notifications_router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Notification).where(
            Notification.id == notification_id,
            Notification.user_id == current_user.id,
        )
    )
    notification = result.scalar_one_or_none()
    if notification is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return _notification_to_response(notification)


@notifications_router.patch("/read-all", response_model=MarkAllReadResponse)
async def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        update(Notification)
        .where(Notification.user_id == current_user.id, Notification.is_read.is_(False))
        .values(is_read=True)
    )
    await db.commit()
    return MarkAllReadResponse(updated=result.rowcount or 0)


@notifications_router.get("/unread-count", response_model=UnreadCountResponse)
async def unread_count(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(func.count(Notification.id)).where(
            Notification.user_id == current_user.id,
            Notification.is_read.is_(False),
        )
    )
    count = int(result.scalar() or 0)
    return UnreadCountResponse(count=count)


@events_router.get("/", response_model=EventLogListResponse, dependencies=[Depends(RoleChecker(["admin"]))])
async def list_event_logs(
    event_type: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    start_date: datetime | None = Query(default=None),
    end_date: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if event_type:
        filters.append(EventLog.event_type == event_type)
    if entity_type:
        filters.append(EventLog.entity_type == entity_type)
    if start_date:
        filters.append(EventLog.created_at >= start_date)
    if end_date:
        filters.append(EventLog.created_at <= end_date)

    count_result = await db.execute(select(func.count(EventLog.id)).where(*filters))
    total = int(count_result.scalar() or 0)

    result = await db.execute(
        select(EventLog)
        .where(*filters)
        .order_by(EventLog.created_at.desc(), EventLog.id.desc())
        .limit(limit)
        .offset(offset)
    )
    event_logs = result.scalars().all()

    items = [
        EventLogResponse(
            id=log.id,
            event_type=log.event_type,
            entity_type=log.entity_type,
            entity_id=log.entity_id,
            payload=_parse_json(log.payload),
            created_at=log.created_at,
        )
        for log in event_logs
    ]
    return EventLogListResponse(items=items, limit=limit, offset=offset, total=total)


@events_router.get(
    "/test/context",
    response_model=EventTestContextResponse,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def get_test_context(db: AsyncSession = Depends(get_db)):
    users_result = await db.execute(select(User).order_by(User.role.asc(), User.id.asc()))
    users = users_result.scalars().all()

    buyer_profiles_result = await db.execute(select(BuyerProfile.user_id, BuyerProfile.id))
    buyer_profiles_map = {int(row[0]): int(row[1]) for row in buyer_profiles_result.all()}

    supplier_profiles_result = await db.execute(select(SupplierProfile.user_id, SupplierProfile.id))
    supplier_profiles_map = {int(row[0]): int(row[1]) for row in supplier_profiles_result.all()}

    context_users = [
        EventTestContextUser(
            id=user.id,
            email=user.email,
            role=user.role,
            is_active=user.is_active,
            buyer_profile_id=buyer_profiles_map.get(user.id),
            supplier_profile_id=supplier_profiles_map.get(user.id),
        )
        for user in users
    ]

    first_buyer = next((user for user in users if user.role == "buyer"), None)
    first_supplier = next((user for user in users if user.role == "supplier"), None)
    first_admin = next((user for user in users if user.role == "admin"), None)

    buyer_id = first_buyer.id if first_buyer else 0
    supplier_id = first_supplier.id if first_supplier else 0
    admin_id = first_admin.id if first_admin else 0
    supplier_profile_id = supplier_profiles_map.get(supplier_id, 0)

    templates = {
        "ORDER_PLACED": {
            "event_type": "ORDER_PLACED",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "factory_name": "Swagger Test Factory",
                "parts_count": 3,
                "buyer_user_id": buyer_id,
            },
            "target_user_ids": [],
        },
        "SUPPLIER_MATCHED": {
            "event_type": "SUPPLIER_MATCHED",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "buyer_user_id": buyer_id,
                "supplier_user_id": supplier_id,
                "supplier_id": supplier_profile_id,
                "supplier_name": "Swagger Supplier",
            },
            "target_user_ids": [],
        },
        "ORDER_CONFIRMED": {
            "event_type": "ORDER_CONFIRMED",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "buyer_user_id": buyer_id,
                "order_item_id": 1,
                "supplier_name": "Swagger Supplier",
            },
            "target_user_ids": [],
        },
        "ORDER_DISPATCHED": {
            "event_type": "ORDER_DISPATCHED",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "buyer_user_id": buyer_id,
            },
            "target_user_ids": [],
        },
        "ORDER_IN_TRANSIT": {
            "event_type": "ORDER_IN_TRANSIT",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "buyer_user_id": buyer_id,
            },
            "target_user_ids": [],
        },
        "ETA_UPDATED": {
            "event_type": "ETA_UPDATED",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "buyer_user_id": buyer_id,
                "eta": "2026-02-15T13:30:00Z",
            },
            "target_user_ids": [],
        },
        "ORDER_DELIVERED": {
            "event_type": "ORDER_DELIVERED",
            "payload": {
                "order_id": 5001,
                "entity_type": "order",
                "entity_id": 5001,
                "buyer_user_id": buyer_id,
                "supplier_id": supplier_profile_id,
            },
            "target_user_ids": [],
        },
        "ORDER_CANCELLED": {
            "event_type": "ORDER_CANCELLED",
            "payload": {
                "order_id": 5002,
                "entity_type": "order",
                "entity_id": 5002,
                "supplier_user_id": supplier_id,
                "supplier_id": supplier_profile_id,
            },
            "target_user_ids": [],
        },
        "LOW_STOCK_ALERT": {
            "event_type": "LOW_STOCK_ALERT",
            "payload": {
                "entity_type": "inventory",
                "entity_id": 88,
                "part_name": "SKF 6205 Bearing",
                "quantity_remaining": 2,
                "supplier_user_id": supplier_id,
                "supplier_id": supplier_profile_id,
            },
            "target_user_ids": [admin_id],
        },
        "DELIVERY_PLANNED": {
            "event_type": "DELIVERY_PLANNED",
            "payload": {
                "entity_type": "delivery",
                "entity_id": 120,
                "delivery_id": 120,
            },
            "target_user_ids": [admin_id],
        },
        "DELIVERY_COMPLETED": {
            "event_type": "DELIVERY_COMPLETED",
            "payload": {
                "entity_type": "delivery",
                "entity_id": 120,
                "delivery_id": 120,
            },
            "target_user_ids": [admin_id],
        },
    }

    return EventTestContextResponse(users=context_users, sample_event_templates=templates)


@events_router.post(
    "/test/emit",
    response_model=EventTestEmitResponse,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def test_emit_event(payload: EventTestEmitRequest, db: AsyncSession = Depends(get_db)):
    requested_targets = sorted({uid for uid in payload.target_user_ids if uid > 0})
    if requested_targets:
        valid_result = await db.execute(select(User.id).where(User.id.in_(requested_targets)))
        valid_ids = {int(row[0]) for row in valid_result.all()}
        missing = sorted(set(requested_targets) - valid_ids)
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown target_user_ids: {missing}",
            )

    result = await emit_event(payload.event_type, payload.payload, requested_targets)
    return EventTestEmitResponse(**result)


@events_router.post(
    "/test/order-lifecycle",
    response_model=EventLifecycleTestResponse,
    dependencies=[Depends(RoleChecker(["admin"]))],
)
async def test_order_lifecycle(payload: EventLifecycleTestRequest):
    base_payload = {
        "order_id": payload.order_id,
        "entity_type": "order",
        "entity_id": payload.order_id,
        "buyer_user_id": payload.buyer_user_id,
        "supplier_user_id": payload.supplier_user_id,
        "supplier_id": payload.supplier_id,
        "order_item_id": payload.order_item_id,
        "supplier_name": "Lifecycle Supplier",
    }

    ordered_events: list[tuple[str, dict[str, object]]] = [
        (
            "ORDER_PLACED",
            {
                **base_payload,
                "factory_name": "Lifecycle Factory",
                "parts_count": payload.order_item_id,
            },
        ),
        ("SUPPLIER_MATCHED", base_payload),
        ("ORDER_CONFIRMED", base_payload),
        ("ORDER_DISPATCHED", base_payload),
    ]
    if payload.include_eta_update:
        ordered_events.append(("ETA_UPDATED", {**base_payload, "eta": "2026-02-15T13:30:00Z"}))
    ordered_events.append(("ORDER_IN_TRANSIT", base_payload))

    if payload.include_order_cancelled:
        ordered_events.append(("ORDER_CANCELLED", base_payload))
    else:
        ordered_events.append(("ORDER_DELIVERED", base_payload))

    emitted_events: list[str] = []
    results: list[EventTestEmitResponse] = []
    for event_type, event_payload in ordered_events:
        result = await emit_event(event_type, event_payload, [])
        emitted_events.append(event_type)
        results.append(EventTestEmitResponse(**result))

    return EventLifecycleTestResponse(emitted_events=emitted_events, results=results)


router = APIRouter()
router.include_router(notifications_router)
router.include_router(events_router)
