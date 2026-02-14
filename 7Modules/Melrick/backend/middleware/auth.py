from __future__ import annotations

import os
from typing import Callable, Dict, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError

ALGORITHM = "HS256"
SECRET_KEY = os.getenv("JWT_SECRET", "dev-secret-change-me")
ALLOW_UNAUTHENTICATED = os.getenv("ALLOW_UNAUTHENTICATED", "true").lower() == "true"

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(token: str = Depends(oauth2_scheme)) -> Dict:
    if not token:
        if ALLOW_UNAUTHENTICATED:
            return {"sub": 0, "role": "admin"}
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


class RoleChecker:
    def __init__(self, roles: List[str]):
        self.roles = set(roles)

    def __call__(self, user: Dict = Depends(get_current_user)) -> Dict:
        if user.get("role") not in self.roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user


def require_roles(roles: List[str]) -> Callable:
    return RoleChecker(roles)
