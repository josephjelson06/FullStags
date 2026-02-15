"""JWT helpers and FastAPI auth dependencies."""

from __future__ import annotations

import hashlib
import hmac
import json
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from typing import Any

from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerifyMismatchError
from fastapi import Depends, HTTPException, Request

from app.config import JWT_ALGORITHM, JWT_EXPIRY_HOURS, JWT_SECRET
from app.database import get_db
from app.repositories import user_repo

_PASSWORD_HASHER = PasswordHasher()


def hash_password(password: str) -> str:
    """Create an Argon2id hash for a password."""
    return _PASSWORD_HASHER.hash(password)


def verify_password(password: str, stored: str) -> bool:
    """Verify Argon2 hash with backward-compat support for legacy SHA format."""
    try:
        return _PASSWORD_HASHER.verify(stored, password)
    except VerifyMismatchError:
        return False
    except InvalidHashError:
        # Backward-compat: legacy salt$sha256 hash format.
        if "$" not in stored:
            return False
        salt, digest = stored.split("$", 1)
        return hmac.compare_digest(hashlib.sha256((salt + password).encode()).hexdigest(), digest)


# Minimal JWT (no pyjwt dependency)
def _b64e(data: bytes) -> str:
    return urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64d(s: str) -> bytes:
    pad = (-len(s)) % 4
    return urlsafe_b64decode(s + "=" * pad)


def _sign(msg: str) -> str:
    return _b64e(hmac.new(JWT_SECRET.encode(), msg.encode(), hashlib.sha256).digest())


def create_token(user_id: str, role: str) -> str:
    header = _b64e(json.dumps({"alg": JWT_ALGORITHM, "typ": "JWT"}).encode())
    payload = _b64e(
        json.dumps(
            {
                "sub": user_id,
                "role": role,
                "exp": int(time.time()) + JWT_EXPIRY_HOURS * 3600,
            }
        ).encode()
    )
    sig = _sign(f"{header}.{payload}")
    return f"{header}.{payload}.{sig}"


def decode_token(token: str) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise ValueError("bad token")

    header, payload, sig = parts
    if not hmac.compare_digest(_sign(f"{header}.{payload}"), sig):
        raise ValueError("bad signature")

    data = json.loads(_b64d(payload))
    if data.get("exp", 0) < time.time():
        raise ValueError("expired")

    return data


# FastAPI dependencies
def _extract_token(request: Request) -> str:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid auth token")
    return auth[7:]


def get_current_user(request: Request) -> dict:
    token = _extract_token(request)
    try:
        data = decode_token(token)
    except ValueError:
        raise HTTPException(status_code=401, detail="Missing or invalid auth token")

    with get_db() as conn:
        user = user_repo.find_by_id(conn, data["sub"])

    if user is None:
        raise HTTPException(status_code=401, detail="Missing or invalid auth token")

    return user


def require_role(*roles: str):
    """Return a dependency that ensures user has one of the given roles."""

    def checker(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="User role not allowed for this action")
        return user

    return checker
