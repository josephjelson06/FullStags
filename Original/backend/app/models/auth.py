"""Auth request/response schemas."""

from __future__ import annotations

from pydantic import BaseModel, Field

from app.models.shared import Location, Role


class RegisterRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=120)
    role: Role
    companyName: str = Field(min_length=1, max_length=160)
    location: Location | None = None


class LoginRequest(BaseModel):
    email: str = Field(min_length=3)
    password: str = Field(min_length=8)


class AuthResponse(BaseModel):
    id: str
    email: str
    name: str
    role: Role
    companyName: str
    location: Location | None = None
    token: str
