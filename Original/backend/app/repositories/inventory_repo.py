"""Inventory repository — DB operations for inventory_items table."""

from __future__ import annotations

import sqlite3
from typing import Optional


def find_by_id(conn: sqlite3.Connection, item_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,)).fetchone()
    return dict(row) if row else None


def find_by_supplier_and_part(conn: sqlite3.Connection, supplier_id: str, part_number: str) -> Optional[dict]:
    row = conn.execute(
        "SELECT id FROM inventory_items WHERE supplier_id = ? AND part_number = ?",
        (supplier_id, part_number),
    ).fetchone()
    return dict(row) if row else None


def count_for_supplier(conn: sqlite3.Connection, supplier_id: str, where_extra: str = "", params_extra: list | None = None) -> int:
    clauses = "WHERE supplier_id = ?"
    params: list = [supplier_id]
    if where_extra:
        clauses += f" AND {where_extra}"
        params.extend(params_extra or [])
    return conn.execute(f"SELECT COUNT(*) FROM inventory_items {clauses}", params).fetchone()[0]


def list_for_supplier(
    conn: sqlite3.Connection,
    supplier_id: str,
    q: str | None,
    limit: int,
    offset: int,
) -> tuple[list[dict], int]:
    clauses = ["supplier_id = ?"]
    params: list = [supplier_id]

    if q:
        clauses.append("(part_name LIKE ? OR part_number LIKE ?)")
        like = f"%{q}%"
        params.extend([like, like])

    where = " WHERE " + " AND ".join(clauses)
    total = conn.execute(f"SELECT COUNT(*) FROM inventory_items{where}", params).fetchone()[0]
    rows = conn.execute(
        f"SELECT * FROM inventory_items{where} ORDER BY part_name LIMIT ? OFFSET ?",
        params + [limit, offset],
    ).fetchall()
    return [dict(r) for r in rows], total


def create(
    conn: sqlite3.Connection,
    item_id: str,
    supplier_id: str,
    part_name: str,
    part_number: str,
    quantity: int,
    price: float,
) -> None:
    conn.execute(
        "INSERT INTO inventory_items (id, supplier_id, part_name, part_number, quantity, price) VALUES (?, ?, ?, ?, ?, ?)",
        (item_id, supplier_id, part_name, part_number, quantity, price),
    )


def update(conn: sqlite3.Connection, item_id: str, updates: dict) -> None:
    set_clause = ", ".join(f"{k} = ?" for k in updates)
    conn.execute(f"UPDATE inventory_items SET {set_clause} WHERE id = ?", list(updates.values()) + [item_id])


def check_part_number_duplicate(conn: sqlite3.Connection, supplier_id: str, part_number: str, exclude_id: str) -> bool:
    row = conn.execute(
        "SELECT id FROM inventory_items WHERE supplier_id = ? AND part_number = ? AND id != ?",
        (supplier_id, part_number, exclude_id),
    ).fetchone()
    return row is not None


def delete(conn: sqlite3.Connection, item_id: str) -> None:
    conn.execute("DELETE FROM inventory_items WHERE id = ?", (item_id,))
