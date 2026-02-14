"""Auth endpoints: register and login."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.database import get_db
from app.deps.auth import create_token, hash_password, verify_password
from app.models import AuthResponse, Location, LoginRequest, RegisterRequest
from app.repositories import user_repo

router = APIRouter(prefix="/api/auth", tags=["auth"])


def _iso_now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@router.post("/register", response_model=AuthResponse, status_code=201)
def register(body: RegisterRequest) -> AuthResponse:
    if body.role in ("buyer", "supplier") and body.location is None:
        raise HTTPException(status_code=400, detail="Validation failed: location is required for buyer and supplier roles")

    with get_db() as conn:
        if user_repo.find_by_email(conn, body.email):
            raise HTTPException(status_code=409, detail="Email already registered")

        user_id = f"user_{uuid4().hex[:6]}"
        user_repo.create(
            conn,
            user_id=user_id,
            email=body.email.strip().lower(),
            password_hash=hash_password(body.password),
            name=body.name.strip(),
            role=body.role,
            company_name=body.companyName.strip(),
            lat=body.location.lat if body.location else None,
            lng=body.location.lng if body.location else None,
            address=body.location.address.strip() if body.location else None,
            created_at=_iso_now(),
        )

    token = create_token(user_id, body.role)
    loc = Location(lat=body.location.lat, lng=body.location.lng, address=body.location.address) if body.location else None

    return AuthResponse(
        id=user_id,
        email=body.email.strip().lower(),
        name=body.name.strip(),
        role=body.role,
        companyName=body.companyName.strip(),
        location=loc,
        token=token,
    )


@router.post("/login", response_model=AuthResponse)
def login(body: LoginRequest) -> AuthResponse:
    with get_db() as conn:
        user = user_repo.find_by_email(conn, body.email.strip().lower())

    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user["id"], user["role"])
    loc = Location(lat=user["lat"], lng=user["lng"], address=user["address"]) if user["lat"] is not None else None

    return AuthResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        role=user["role"],
        companyName=user["company_name"],
        location=loc,
        token=token,
    )
