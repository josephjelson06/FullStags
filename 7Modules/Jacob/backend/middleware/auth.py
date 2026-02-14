import json
import os
from typing import Callable, Dict, List

from fastapi import Depends, Header, HTTPException, status

ALLOWED_ROLES = {"buyer", "supplier", "admin"}


def _validate_user_payload(data: dict) -> Dict[str, int | str]:
    if not isinstance(data, dict) or "user_id" not in data or "role" not in data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth payload must contain user_id and role",
        )

    try:
        user_id = int(data["user_id"])
    except (TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth payload user_id must be an integer",
        ) from exc

    role = str(data["role"])
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Auth payload role must be buyer, supplier, or admin",
        )

    return {"user_id": user_id, "role": role}


def _get_user_from_jwt(authorization: str | None) -> Dict | None:
    if not authorization:
        return None
    if not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header must be Bearer token",
        )

    token = authorization.split(" ", 1)[1].strip()
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Bearer token is missing",
        )

    try:
        from jose import JWTError, jwt  # type: ignore[import-not-found]
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT auth dependency is not installed",
        ) from exc

    secret_key = os.getenv("JWT_SECRET_KEY", "dev-secret-key")
    algorithm = os.getenv("JWT_ALGORITHM", "HS256")
    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        ) from exc

    if "sub" not in payload or "role" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token must include sub and role",
        )

    return _validate_user_payload(
        {
            "user_id": payload["sub"],
            "role": payload["role"],
        }
    )


def get_current_user(
    authorization: str | None = Header(default=None),
    x_test_user: str | None = Header(default=None),
) -> Dict:
    """
    Unified auth dependency:
    1) Uses JWT Bearer token when Authorization header is present.
    2) Falls back to X-Test-User for local module-level development.
    """
    jwt_user = _get_user_from_jwt(authorization)
    if jwt_user:
        return jwt_user

    if not x_test_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    try:
        data = json.loads(x_test_user)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid X-Test-User header JSON",
        ) from exc

    return _validate_user_payload(data)


class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = set(allowed_roles)

    def __call__(self, current_user: Dict = Depends(get_current_user)) -> Dict:
        if current_user.get("role") not in self.allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return current_user


def require_roles(*roles: str) -> Callable:
    return RoleChecker(list(roles))
