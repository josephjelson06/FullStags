from __future__ import annotations

import importlib
import importlib.util
import logging
from typing import Optional

import socketio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.routing import APIRouter

from . import models  # noqa: F401
from .database import Base, engine
from .events.bus import init_socket_server

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

sio = socketio.AsyncServer(async_mode="asgi", cors_allowed_origins="*")

fastapi_app = FastAPI(
    title="Industrial Spare Parts Platform API",
    description=(
        "Unified backend for industrial spare-parts procurement.\n\n"
        "Current implemented modules in this workspace:\n"
        "- Module 2: Supplier Matching (`/api/matching/*`)\n"
        "- Module 3: Delivery Routing (`/api/deliveries/*`)\n\n"
        "Auth:\n"
        "- Protected endpoints require `Authorization: Bearer <jwt>`.\n"
        "- For local testing without JWT, set `ALLOW_UNAUTHENTICATED=true`.\n"
    ),
    version="2.0.0-phase2",
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "docExpansion": "none",
    },
    openapi_tags=[
        {"name": "matching", "description": "Module 2 supplier matching APIs."},
        {"name": "deliveries", "description": "Module 3 delivery planning and tracking APIs."},
        {"name": "analytics", "description": "Module 7 operational analytics APIs."},
    ],
)
fastapi_app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROUTER_MODULES = [
    "auth",
    "users",
    "suppliers",
    "inventory",
    "orders",
    "matching",
    "deliveries",
    "notifications",
    "analytics",
]


def _load_router(module_name: str) -> Optional[APIRouter]:
    package_name = __package__ or "backend"
    module_path = f"{package_name}.routers.{module_name}"
    if importlib.util.find_spec(module_path) is None:
        logger.info("Router module %s not present. Skipping include.", module_path)
        return None

    module = importlib.import_module(f".routers.{module_name}", package=package_name)
    router = getattr(module, "router", None)
    if router is None:
        logger.warning("Router module %s has no `router` export. Skipping.", module_path)
        return None
    if not isinstance(router, APIRouter):
        logger.warning("Router module %s exposes invalid `router`. Skipping.", module_path)
        return None
    return router


for module_name in ROUTER_MODULES:
    router = _load_router(module_name)
    if router is not None:
        fastapi_app.include_router(router)


@fastapi_app.on_event("startup")
async def on_startup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


init_socket_server(sio)

app = socketio.ASGIApp(sio, other_asgi_app=fastapi_app)
