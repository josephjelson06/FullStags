"""SQLite connection and schema management."""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from app.config import DATA_DIR, DATABASE_URL, DB_PATH, SCHEMA_VERSION


def _resolve_sqlite_path(url: str) -> Path:
    if url.startswith("sqlite:///"):
        raw_path = url.replace("sqlite:///", "", 1)
        path = Path(raw_path)
        if not path.is_absolute():
            return (DATA_DIR / path).resolve()
        return path
    if url.startswith("postgres://") or url.startswith("postgresql://"):
        raise RuntimeError(
            "PostgreSQL profile is configured but not wired in this v0 runtime. "
            "Set DATABASE_URL=sqlite:///supply_match.db for current execution."
        )
    raise RuntimeError("Unsupported DATABASE_URL scheme. Use sqlite:/// or postgresql://")


def _connect() -> sqlite3.Connection:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    sqlite_path = _resolve_sqlite_path(DATABASE_URL) if DATABASE_URL else DB_PATH
    sqlite_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(sqlite_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    conn.execute("PRAGMA journal_mode = WAL")
    return conn


@contextmanager
def get_db() -> Iterator[sqlite3.Connection]:
    """Context-managed database connection. Auto-commits on success, rolls back on error."""
    conn = _connect()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


# Keep legacy helper for backward compat during migration — will be removed
def get_connection() -> sqlite3.Connection:
    return _connect()


def _drop_all(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        DROP TABLE IF EXISTS order_legs;
        DROP TABLE IF EXISTS matches;
        DROP TABLE IF EXISTS orders;
        DROP TABLE IF EXISTS inventory_items;
        DROP TABLE IF EXISTS users;
        """
    )


def _create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript(
        """
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT NOT NULL UNIQUE COLLATE NOCASE,
            password_hash TEXT NOT NULL,
            name TEXT NOT NULL,
            role TEXT NOT NULL CHECK (role IN ('buyer','supplier','admin')),
            company_name TEXT NOT NULL,
            lat REAL,
            lng REAL,
            address TEXT,
            pick_time_minutes INTEGER NOT NULL DEFAULT 15,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS inventory_items (
            id TEXT PRIMARY KEY,
            supplier_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            part_name TEXT NOT NULL,
            part_number TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            price REAL NOT NULL CHECK (price > 0),
            UNIQUE (supplier_id, part_number)
        );

        CREATE TABLE IF NOT EXISTS orders (
            id TEXT PRIMARY KEY,
            buyer_id TEXT NOT NULL REFERENCES users(id),
            part_name TEXT,
            part_number TEXT,
            urgency TEXT NOT NULL CHECK (urgency IN ('critical','high','standard')),
            status TEXT NOT NULL DEFAULT 'matching'
                CHECK (status IN ('matching','pending_acceptance','picking',
                       'courier_to_supplier','courier_to_factory','delivered')),
            delivery_lat REAL NOT NULL,
            delivery_lng REAL NOT NULL,
            delivery_address TEXT NOT NULL,
            selected_supplier_id TEXT REFERENCES users(id),
            selected_match_id TEXT,
            part_price REAL,
            pick_time_minutes INTEGER,
            drive_time_minutes INTEGER,
            total_time_minutes INTEGER,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            delivered_at TEXT
        );

        CREATE TABLE IF NOT EXISTS matches (
            id TEXT PRIMARY KEY,
            order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            supplier_id TEXT NOT NULL REFERENCES users(id),
            supplier_name TEXT NOT NULL,
            distance_km REAL NOT NULL,
            pick_time_minutes INTEGER NOT NULL,
            drive_time_minutes INTEGER NOT NULL,
            total_time_minutes INTEGER NOT NULL,
            part_price REAL NOT NULL,
            supplier_lat REAL NOT NULL,
            supplier_lng REAL NOT NULL,
            supplier_address TEXT NOT NULL,
            is_declined INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS order_legs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
            label TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','in_progress','completed'))
        );

        CREATE INDEX IF NOT EXISTS idx_orders_buyer ON orders(buyer_id);
        CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
        CREATE INDEX IF NOT EXISTS idx_orders_supplier ON orders(selected_supplier_id);
        CREATE INDEX IF NOT EXISTS idx_matches_order ON matches(order_id);
        CREATE INDEX IF NOT EXISTS idx_inventory_supplier ON inventory_items(supplier_id);
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        """
    )


def create_tables() -> None:
    conn = _connect()
    ver = conn.execute("PRAGMA user_version").fetchone()[0]
    if ver != SCHEMA_VERSION:
        _drop_all(conn)
        _create_schema(conn)
        conn.execute(f"PRAGMA user_version = {SCHEMA_VERSION}")
    else:
        _create_schema(conn)
    conn.commit()
    conn.close()
