"""UrgentParts FastAPI application entrypoint."""

from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse

from app.config import CORS_ORIGINS
from app.database import create_tables
from app.routes import analytics, auth, inventory, order_actions, orders, route_plans, supplier_profile
from app.seed import seed_data

logger = logging.getLogger("urgentparts.api")
if not logging.getLogger().handlers:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    """Startup: create schema and seed data."""
    create_tables()
    seed_data()
    yield


app = FastAPI(
    title="UrgentParts API",
    description="Industrial emergency supplier allocation engine - v0",
    version="0.2.0",
    lifespan=lifespan,
)


def _error_payload(message: str, code: str, trace_id: str, details: Any | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {
        "code": code,
        "message": message,
        "traceId": trace_id,
        # Backward-compat for clients still reading {"error": "..."}
        "error": message,
    }
    if details is not None:
        payload["details"] = details
    return payload


@app.middleware("http")
async def request_context_middleware(request: Request, call_next):
    trace_id = request.headers.get("X-Request-ID") or uuid4().hex
    request.state.trace_id = trace_id

    start = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - start) * 1000

    response.headers["X-Request-ID"] = trace_id
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    logger.info(
        "request_complete method=%s path=%s status=%s duration_ms=%.2f trace_id=%s",
        request.method,
        request.url.path,
        response.status_code,
        elapsed_ms,
        trace_id,
    )

    return response


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", uuid4().hex)
    detail = str(exc.detail)
    return JSONResponse(
        status_code=exc.status_code,
        content=_error_payload(detail, f"http_{exc.status_code}", trace_id),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", uuid4().hex)
    first = exc.errors()[0] if exc.errors() else {}
    field = " -> ".join(str(loc) for loc in first.get("loc", []))
    msg = first.get("msg", "Validation error")
    summary = f"Validation failed: {field}: {msg}" if field else f"Validation failed: {msg}"
    return JSONResponse(
        status_code=422,
        content=_error_payload(summary, "validation_error", trace_id, details=exc.errors()),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    trace_id = getattr(request.state, "trace_id", uuid4().hex)
    logger.exception("unhandled_exception trace_id=%s path=%s", trace_id, request.url.path)
    return JSONResponse(
        status_code=500,
        content=_error_payload("Internal server error", "internal_error", trace_id),
    )


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.include_router(auth.router)
app.include_router(orders.router)
app.include_router(order_actions.router)
app.include_router(route_plans.router)
app.include_router(inventory.router)
app.include_router(supplier_profile.router)
app.include_router(analytics.router)
