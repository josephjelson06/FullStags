"""Application configuration constants."""

from __future__ import annotations

import os
from pathlib import Path

BASE_DIR: Path = Path(__file__).resolve().parent.parent
DATA_DIR: Path = BASE_DIR / "data"
DB_PATH: Path = DATA_DIR / "supply_match.db"


def _env_str(name: str, default: str) -> str:
    value = os.getenv(name)
    return value if value is not None else default


def _env_int(name: str, default: int) -> int:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be an integer") from exc


def _env_float(name: str, default: float) -> float:
    value = os.getenv(name)
    if value is None:
        return default
    try:
        return float(value)
    except ValueError as exc:
        raise ValueError(f"{name} must be a float") from exc


def _env_csv(name: str, default: str) -> list[str]:
    raw = _env_str(name, default)
    return [part.strip() for part in raw.split(",") if part.strip()]


APP_ENV: str = _env_str("APP_ENV", "development")
DATABASE_URL: str = _env_str("DATABASE_URL", f"sqlite:///{DB_PATH.as_posix()}")

# Schema version - bump to force re-creation.
SCHEMA_VERSION: int = _env_int("SCHEMA_VERSION", 12)

# JWT
JWT_SECRET: str = _env_str("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM: str = "HS256"
JWT_EXPIRY_HOURS: int = _env_int("JWT_EXPIRY_HOURS", 24)

# Matching
AVERAGE_SPEED_KMPH: float = _env_float("AVERAGE_SPEED_KMPH", 45.0)

# Downtime cost constant: $25,000/hour = 25000/60 per minute
DOWNTIME_COST_PER_MINUTE: float = _env_float("DOWNTIME_COST_PER_MINUTE", 25000.0 / 60.0)

HOST: str = _env_str("HOST", "0.0.0.0")
PORT: int = _env_int("PORT", 8000)

# API
CORS_ORIGINS: list[str] = _env_csv(
    "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
)
