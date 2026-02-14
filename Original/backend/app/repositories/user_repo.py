"""User repository — DB operations for users table."""

from __future__ import annotations

import sqlite3
from typing import Optional


def find_by_email(conn: sqlite3.Connection, email: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email,)).fetchone()
    return dict(row) if row else None


def find_by_id(conn: sqlite3.Connection, user_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return dict(row) if row else None


def create(
    conn: sqlite3.Connection,
    user_id: str,
    email: str,
    password_hash: str,
    name: str,
    role: str,
    company_name: str,
    lat: float | None,
    lng: float | None,
    address: str | None,
    created_at: str,
) -> None:
    conn.execute(
        """
        INSERT INTO users (id, email, password_hash, name, role, company_name,
                           lat, lng, address, pick_time_minutes, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?)
        """,
        (user_id, email, password_hash, name, role, company_name, lat, lng, address, created_at),
    )


def update_pick_time(conn: sqlite3.Connection, user_id: str, minutes: int) -> None:
    conn.execute("UPDATE users SET pick_time_minutes = ? WHERE id = ?", (minutes, user_id))
