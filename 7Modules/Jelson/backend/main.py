from urllib.parse import parse_qs

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.database import close_db, init_db
from backend.events import bus
from backend.middleware.auth import verify_token
import backend.models  # noqa: F401
from backend.routers import auth as auth_router
from backend.routers import analytics as analytics_router
from backend.routers import deliveries as deliveries_router
from backend.routers import inventory as inventory_router
from backend.routers import matching as matching_router
from backend.routers import notifications as notifications_router
from backend.routers import orders as orders_router
from backend.routers import suppliers as suppliers_router
from backend.routers import users as users_router

fastapi_app = FastAPI(title="SpareHub API")

fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")
app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app, socketio_path="ws/socket.io")

bus.sio_server = sio


@sio.event
async def connect(sid, environ, auth):
    token = None
    if auth and isinstance(auth, dict):
        token = auth.get("token")
    if not token:
        qs = parse_qs(environ.get("QUERY_STRING", ""))
        token_list = qs.get("token", [])
        token = token_list[0] if token_list else None

    if not token:
        return False

    try:
        payload = verify_token(token)
    except Exception:
        return False

    user_id = payload.get("sub")
    role = payload.get("role")
    if user_id is None or role is None:
        return False

    try:
        user_id_int = int(user_id)
    except (TypeError, ValueError):
        return False

    user_room = f"user_{user_id_int}"
    role_room = f"role_{role}"
    await sio.enter_room(sid, user_room)
    await sio.enter_room(sid, role_room)
    await sio.save_session(sid, {"user_id": user_id_int, "role": role, "rooms": [user_room, role_room]})
    return True


@sio.event
async def disconnect(sid):
    try:
        session = await sio.get_session(sid)
    except KeyError:
        return

    rooms = session.get("rooms", []) if session else []
    for room in rooms:
        await sio.leave_room(sid, room)


@fastapi_app.on_event("startup")
async def on_startup():
    await init_db()


@fastapi_app.on_event("shutdown")
async def on_shutdown():
    await close_db()


fastapi_app.include_router(auth_router.router)
fastapi_app.include_router(users_router.router)
fastapi_app.include_router(suppliers_router.router)
fastapi_app.include_router(inventory_router.router)
fastapi_app.include_router(orders_router.router)
fastapi_app.include_router(matching_router.router)
fastapi_app.include_router(deliveries_router.router)
fastapi_app.include_router(notifications_router.router)
fastapi_app.include_router(analytics_router.router)
