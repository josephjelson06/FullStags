"""Seed v0 demo data: 5 users, diverse inventory, 3 orders with matches."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from app.database import get_db
from app.deps.auth import hash_password
from app.services.matching import compute_matches


def _iso(dt: datetime | None = None) -> str:
    if dt is None:
        dt = datetime.now(UTC)
    return dt.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def seed_data() -> None:
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if count > 0:
            return

        now = datetime.now(UTC)
        now_str = _iso(now)

        # ──── Users ────
        users = [
            ("user_buyer1",  "buyer@factory.com",         hash_password("password123"), "Alex Torres",            "buyer",    "Midwest Auto Assembly",     41.8781, -87.6298, "1400 Industrial Blvd, Chicago, IL"),
            ("user_sup1",    "supplier@parts.com",         hash_password("password123"), "FastParts Distribution",  "supplier", "FastParts Distribution",    41.92,   -87.65,  "800 Supply Road, Evanston, IL"),
            ("user_sup2",    "supplier2@midwest.com",      hash_password("password123"), "Noah Fields",            "supplier", "Midwest Industrial Supply", 41.85,   -87.68,  "2200 Warehouse Ave, Cicero, IL"),
            ("user_sup3",    "supplier3@allied.com",       hash_password("password123"), "Priya Shah",             "supplier", "Allied Components Inc.",    42.0334, -87.8834, "6100 Touhy Ave, Niles, IL"),
            ("user_admin1",  "admin@urgentparts.com",      hash_password("password123"), "System Admin",           "admin",    "UrgentParts Inc",           None,    None,    None),
        ]
        conn.executemany(
            """
            INSERT INTO users (id, email, password_hash, name, role, company_name,
                               lat, lng, address, pick_time_minutes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 15, ?)
            """,
            [(*u, now_str) for u in users],
        )

        # ──── Inventory (spread across 3 suppliers) ────
        items = [
            # Supplier 1: FastParts Distribution
            ("inv_001", "user_sup1", "Hydraulic Pressure Sensor", "HPS-4420",  3, 349.99),
            ("inv_002", "user_sup1", "Conveyor Belt Tensioner",   "CBT-7801",  1, 124.50),
            ("inv_003", "user_sup1", "Thermal Relay Switch",      "TRS-2200",  5, 189.99),
            ("inv_004", "user_sup1", "Ball Bearing 6205",         "BB-6205",  20,  12.00),
            ("inv_005", "user_sup1", "Servo Motor SM-400",        "SM-400",    2, 275.00),
            # Supplier 2: Midwest Industrial Supply
            ("inv_006", "user_sup2", "Hydraulic Pressure Sensor", "HPS-4420",  5, 375.00),
            ("inv_007", "user_sup2", "Servo Drive Board",         "SDB-310",   3, 615.00),
            ("inv_008", "user_sup2", "Thermal Relay Switch",      "TRS-2200",  2, 195.00),
            ("inv_009", "user_sup2", "Linear Actuator LA-200",    "LA-200",    4, 430.00),
            # Supplier 3: Allied Components Inc.
            ("inv_010", "user_sup3", "Hydraulic Pressure Sensor", "HPS-4420",  2, 360.00),
            ("inv_011", "user_sup3", "Ball Bearing 6205",         "BB-6205",  50,  10.50),
            ("inv_012", "user_sup3", "Conveyor Belt Tensioner",   "CBT-7801",  8, 118.00),
            ("inv_013", "user_sup3", "PLC Module PM-500",         "PM-500",    1, 890.00),
        ]
        conn.executemany(
            "INSERT INTO inventory_items (id, supplier_id, part_name, part_number, quantity, price) VALUES (?, ?, ?, ?, ?, ?)",
            items,
        )

        # ──── Order 1: Active matching — HPS-4420 (3 suppliers compete) ────
        order1_id = "ord_demo01"
        conn.execute(
            """
            INSERT INTO orders (id, buyer_id, part_name, part_number, urgency, status,
                                delivery_lat, delivery_lng, delivery_address, created_at, updated_at)
            VALUES (?, 'user_buyer1', 'Hydraulic Pressure Sensor', 'HPS-4420', 'critical', 'matching',
                    41.8781, -87.6298, '1400 Industrial Blvd, Chicago, IL, Gate 4', ?, ?)
            """,
            (order1_id, now_str, now_str),
        )

        # Build matches from all 3 suppliers that carry HPS-4420
        order1_dict = {"delivery_lat": 41.8781, "delivery_lng": -87.6298, "urgency": "critical"}
        suppliers_for_match = [
            {"id": "user_sup1", "name": "FastParts Distribution",
             "lat": 41.92, "lng": -87.65, "address": "800 Supply Road, Evanston, IL",
             "pick_time_minutes": 15, "part_price": 349.99, "stock_quantity": 3},
            {"id": "user_sup2", "name": "Midwest Industrial Supply",
             "lat": 41.85, "lng": -87.68, "address": "2200 Warehouse Ave, Cicero, IL",
             "pick_time_minutes": 15, "part_price": 375.00, "stock_quantity": 5},
            {"id": "user_sup3", "name": "Allied Components Inc.",
             "lat": 42.0334, "lng": -87.8834, "address": "6100 Touhy Ave, Niles, IL",
             "pick_time_minutes": 15, "part_price": 360.00, "stock_quantity": 2},
        ]
        matches = compute_matches(order1_dict, suppliers_for_match)
        for m in matches:
            conn.execute(
                """
                INSERT INTO matches (id, order_id, supplier_id, supplier_name,
                                     distance_km, pick_time_minutes, drive_time_minutes,
                                     total_time_minutes, part_price,
                                     supplier_lat, supplier_lng, supplier_address)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (f"match_{uuid4().hex[:6]}", order1_id, m["supplier_id"], m["supplier_name"],
                 m["distance_km"], m["pick_time_minutes"], m["drive_time_minutes"],
                 m["total_time_minutes"], m["part_price"],
                 m["supplier_lat"], m["supplier_lng"], m["supplier_address"]),
            )

        # ──── Order 2: Delivered — TRS-2200 ────
        order2_id = "ord_demo02"
        conn.execute(
            """
            INSERT INTO orders (id, buyer_id, part_name, part_number, urgency, status,
                                delivery_lat, delivery_lng, delivery_address,
                                selected_supplier_id, selected_match_id,
                                part_price, pick_time_minutes, drive_time_minutes, total_time_minutes,
                                created_at, updated_at, delivered_at)
            VALUES (?, 'user_buyer1', 'Thermal Relay Switch', 'TRS-2200', 'high', 'delivered',
                    41.8781, -87.6298, '1400 Industrial Blvd, Chicago, IL',
                    'user_sup1', 'match_delivered',
                    189.99, 15, 28, 43,
                    ?, ?, ?)
            """,
            (order2_id, now_str, now_str, now_str),
        )
        conn.execute("INSERT INTO order_legs (order_id, label, status) VALUES (?, 'Courier to Supplier', 'completed')", (order2_id,))
        conn.execute("INSERT INTO order_legs (order_id, label, status) VALUES (?, 'Courier to Factory', 'completed')", (order2_id,))

        # ──── Order 3: Picking — CBT-7801 (shows in-progress state) ────
        order3_id = "ord_demo03"
        conn.execute(
            """
            INSERT INTO orders (id, buyer_id, part_name, part_number, urgency, status,
                                delivery_lat, delivery_lng, delivery_address,
                                selected_supplier_id, selected_match_id,
                                part_price, pick_time_minutes, drive_time_minutes, total_time_minutes,
                                created_at, updated_at)
            VALUES (?, 'user_buyer1', 'Conveyor Belt Tensioner', 'CBT-7801', 'standard', 'picking',
                    41.8781, -87.6298, '1400 Industrial Blvd, Chicago, IL',
                    'user_sup3', 'match_picking',
                    118.00, 15, 35, 50,
                    ?, ?)
            """,
            (order3_id, now_str, now_str),
        )
        conn.execute("INSERT INTO order_legs (order_id, label, status) VALUES (?, 'Courier to Supplier', 'in_progress')", (order3_id,))
        conn.execute("INSERT INTO order_legs (order_id, label, status) VALUES (?, 'Courier to Factory', 'pending')", (order3_id,))