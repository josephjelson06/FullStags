"""Order repository — DB operations for orders, matches, and order_legs tables."""

from __future__ import annotations

import sqlite3
from typing import Optional


# ──── Orders ────

def create_order(
    conn: sqlite3.Connection,
    order_id: str,
    buyer_id: str,
    part_name: str | None,
    part_number: str | None,
    urgency: str,
    delivery_lat: float,
    delivery_lng: float,
    delivery_address: str,
    now: str,
) -> None:
    conn.execute(
        """
        INSERT INTO orders (id, buyer_id, part_name, part_number, urgency, status,
                            delivery_lat, delivery_lng, delivery_address, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'matching', ?, ?, ?, ?, ?)
        """,
        (order_id, buyer_id, part_name, part_number, urgency,
         delivery_lat, delivery_lng, delivery_address, now, now),
    )


def find_order_by_id(conn: sqlite3.Connection, order_id: str) -> Optional[dict]:
    row = conn.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
    return dict(row) if row else None


def update_order_status(conn: sqlite3.Connection, order_id: str, status: str, now: str) -> None:
    conn.execute("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?", (status, now, order_id))


def update_order_supplier_selection(
    conn: sqlite3.Connection,
    order_id: str,
    supplier_id: str,
    match_id: str,
    part_price: float,
    pick_time: int,
    drive_time: int,
    total_time: int,
    now: str,
) -> None:
    conn.execute(
        """
        UPDATE orders SET status = 'pending_acceptance', selected_supplier_id = ?,
                          selected_match_id = ?, part_price = ?, pick_time_minutes = ?,
                          drive_time_minutes = ?, total_time_minutes = ?, updated_at = ?
        WHERE id = ?
        """,
        (supplier_id, match_id, part_price, pick_time, drive_time, total_time, now, order_id),
    )


def reset_order_to_matching(conn: sqlite3.Connection, order_id: str, now: str) -> None:
    conn.execute(
        """
        UPDATE orders SET status = 'matching', selected_supplier_id = NULL,
                          selected_match_id = NULL, part_price = NULL,
                          pick_time_minutes = NULL, drive_time_minutes = NULL,
                          total_time_minutes = NULL, updated_at = ?
        WHERE id = ?
        """,
        (now, order_id),
    )


def mark_delivered(conn: sqlite3.Connection, order_id: str, now: str) -> None:
    conn.execute(
        "UPDATE orders SET status = 'delivered', updated_at = ?, delivered_at = ? WHERE id = ?",
        (now, now, order_id),
    )


def count_orders(conn: sqlite3.Connection, where: str, params: list) -> int:
    return conn.execute(f"SELECT COUNT(*) FROM orders o{where}", params).fetchone()[0]


def list_orders(conn: sqlite3.Connection, where: str, params: list, limit: int, offset: int) -> list[dict]:
    rows = conn.execute(
        f"""
        SELECT o.*, u.company_name AS buyer_company,
               sup.name AS supplier_name_val
        FROM orders o
        JOIN users u ON u.id = o.buyer_id
        LEFT JOIN users sup ON sup.id = o.selected_supplier_id
        {where}
        ORDER BY datetime(o.created_at) DESC
        LIMIT ? OFFSET ?
        """,
        params + [limit, offset],
    ).fetchall()
    return [dict(r) for r in rows]


# ──── Matches ────

def insert_match(
    conn: sqlite3.Connection,
    match_id: str,
    order_id: str,
    supplier_id: str,
    supplier_name: str,
    distance_km: float,
    pick_time: int,
    drive_time: int,
    total_time: int,
    part_price: float,
    supplier_lat: float,
    supplier_lng: float,
    supplier_address: str,
) -> None:
    conn.execute(
        """
        INSERT INTO matches (id, order_id, supplier_id, supplier_name,
                             distance_km, pick_time_minutes, drive_time_minutes,
                             total_time_minutes, part_price,
                             supplier_lat, supplier_lng, supplier_address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (match_id, order_id, supplier_id, supplier_name,
         distance_km, pick_time, drive_time, total_time, part_price,
         supplier_lat, supplier_lng, supplier_address),
    )


def find_matches_for_order(conn: sqlite3.Connection, order_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT * FROM matches WHERE order_id = ? AND is_declined = 0 ORDER BY total_time_minutes",
        (order_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def find_match_by_id(conn: sqlite3.Connection, match_id: str, order_id: str) -> Optional[dict]:
    row = conn.execute(
        "SELECT * FROM matches WHERE id = ? AND order_id = ?", (match_id, order_id)
    ).fetchone()
    return dict(row) if row else None


def decline_match(conn: sqlite3.Connection, match_id: str) -> None:
    conn.execute("UPDATE matches SET is_declined = 1 WHERE id = ?", (match_id,))


def get_selected_match_distance(conn: sqlite3.Connection, order_ids: list[str]) -> dict[str, float]:
    if not order_ids:
        return {}
    ph = ",".join(["?"] * len(order_ids))
    rows = conn.execute(
        f"""SELECT order_id, distance_km FROM matches
            WHERE id IN (SELECT selected_match_id FROM orders WHERE id IN ({ph}) AND selected_match_id IS NOT NULL)""",
        order_ids,
    ).fetchall()
    return {r["order_id"]: r["distance_km"] for r in rows}


# ──── Order Legs ────

def create_legs(conn: sqlite3.Connection, order_id: str) -> None:
    conn.execute("INSERT INTO order_legs (order_id, label, status) VALUES (?, 'Courier to Supplier', 'pending')", (order_id,))
    conn.execute("INSERT INTO order_legs (order_id, label, status) VALUES (?, 'Courier to Factory', 'pending')", (order_id,))


def delete_legs(conn: sqlite3.Connection, order_id: str) -> None:
    conn.execute("DELETE FROM order_legs WHERE order_id = ?", (order_id,))


def update_leg_status(conn: sqlite3.Connection, order_id: str, label: str, status: str) -> None:
    conn.execute("UPDATE order_legs SET status = ? WHERE order_id = ? AND label = ?", (status, order_id, label))


def complete_all_legs(conn: sqlite3.Connection, order_id: str) -> None:
    conn.execute("UPDATE order_legs SET status = 'completed' WHERE order_id = ?", (order_id,))


def get_legs(conn: sqlite3.Connection, order_id: str) -> list[dict]:
    rows = conn.execute(
        "SELECT label, status FROM order_legs WHERE order_id = ? ORDER BY id", (order_id,)
    ).fetchall()
    return [dict(r) for r in rows]


# ──── Suppliers for matching ────

def find_suppliers_with_inventory(
    conn: sqlite3.Connection, search_col: str, search_val: str
) -> list[dict]:
    rows = conn.execute(
        f"""
        SELECT u.id, u.name, u.lat, u.lng, u.address, u.pick_time_minutes,
               i.price AS part_price, i.quantity AS stock_quantity
        FROM users u
        JOIN inventory_items i ON i.supplier_id = u.id
        WHERE u.role = 'supplier'
          AND i.{search_col} = ?
          AND i.quantity > 0
        """,
        (search_val,),
    ).fetchall()
    return [dict(r) for r in rows]


def decrement_inventory(conn: sqlite3.Connection, supplier_id: str, col: str, val: str) -> None:
    conn.execute(
        f"UPDATE inventory_items SET quantity = MAX(0, quantity - 1) WHERE supplier_id = ? AND {col} = ?",
        (supplier_id, val),
    )


# ──── Analytics ────

def count_orders_in_range(conn: sqlite3.Connection, d_from: str, d_to: str) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM orders WHERE DATE(created_at) BETWEEN ? AND ?", (d_from, d_to)
    ).fetchone()[0]


def avg_delivery_time(conn: sqlite3.Connection, d_from: str, d_to: str) -> float:
    return conn.execute(
        "SELECT COALESCE(AVG(total_time_minutes), 0) FROM orders WHERE status = 'delivered' AND DATE(created_at) BETWEEN ? AND ?",
        (d_from, d_to),
    ).fetchone()[0]


def count_delivered_in_range(conn: sqlite3.Connection, d_from: str, d_to: str) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM orders WHERE status = 'delivered' AND DATE(created_at) BETWEEN ? AND ?",
        (d_from, d_to),
    ).fetchone()[0]


def sum_fulfillment_minutes(conn: sqlite3.Connection, d_from: str, d_to: str) -> int:
    return conn.execute(
        "SELECT COALESCE(SUM(total_time_minutes), 0) FROM orders WHERE status = 'delivered' AND DATE(created_at) BETWEEN ? AND ?",
        (d_from, d_to),
    ).fetchone()[0]


def count_active_orders(conn: sqlite3.Connection) -> int:
    return conn.execute(
        "SELECT COUNT(*) FROM orders WHERE status IN ('matching','pending_acceptance','picking','courier_to_supplier','courier_to_factory')"
    ).fetchone()[0]


def count_pending_orders(conn: sqlite3.Connection) -> int:
    return conn.execute("SELECT COUNT(*) FROM orders WHERE status = 'pending_acceptance'").fetchone()[0]
