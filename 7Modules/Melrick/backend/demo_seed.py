from __future__ import annotations

import asyncio
import json
import os
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Sequence, Tuple

from sqlalchemy import select

from backend import models  # noqa: F401
from backend.database import AsyncSessionLocal, Base, engine
from backend.models.delivery import Delivery
from backend.models.inventory import InventoryTransaction, PartCategory, PartsCatalog
from backend.models.notifications import EventLog, Notification
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.users import BuyerProfile, SupplierProfile, User
from backend.services.analytics_service import get_full_snapshot
from backend.services.matching_service import match_full_order, normalize_part_number
from backend.services.order_lifecycle_service import confirm_order_assignments, transition_order_status
from backend.services.reliability import update_reliability_score
from backend.services.routing_service import (
    create_batched_delivery,
    create_single_delivery,
    update_delivery_status,
    update_eta,
)


def progress(message: str) -> None:
    print(f"{message}... ", end="", flush=True)


def done() -> None:
    try:
        print("✓", flush=True)
    except UnicodeEncodeError:
        print("[OK]", flush=True)


def _status_label(event_type: str) -> Tuple[str, str]:
    title_map = {
        "SUPPLIER_MATCHED": "Supplier Match Ready",
        "ORDER_CONFIRMED": "Order Confirmed",
        "ORDER_DISPATCHED": "Order Dispatched",
        "ORDER_IN_TRANSIT": "Order In Transit",
        "ORDER_DELIVERED": "Order Delivered",
        "ORDER_CANCELLED": "Order Cancelled",
        "LOW_STOCK_ALERT": "Low Stock Alert",
        "DELIVERY_PLANNED": "Delivery Planned",
        "DELIVERY_COMPLETED": "Delivery Completed",
        "ETA_UPDATED": "ETA Updated",
    }
    message_map = {
        "SUPPLIER_MATCHED": "Suppliers were matched for your requested parts.",
        "ORDER_CONFIRMED": "Order confirmation completed with accepted assignments.",
        "ORDER_DISPATCHED": "Shipment has been dispatched from supplier warehouse.",
        "ORDER_IN_TRANSIT": "Shipment is currently in transit.",
        "ORDER_DELIVERED": "Shipment has been delivered successfully.",
        "ORDER_CANCELLED": "Order was cancelled and assignments were closed.",
        "LOW_STOCK_ALERT": "One or more catalog items are below reorder level.",
        "DELIVERY_PLANNED": "A delivery route has been planned.",
        "DELIVERY_COMPLETED": "Delivery route was completed.",
        "ETA_UPDATED": "Estimated arrival time has been recalculated.",
    }
    return (
        title_map.get(event_type, event_type.replace("_", " ").title()),
        message_map.get(event_type, f"Event {event_type} was recorded."),
    )


async def reset_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def seed_users_profiles(session) -> Dict[str, Dict[str, object]]:
    users_data = [
        ("admin@sparehub.in", "admin"),
        ("buyer1@sparehub.in", "buyer"),
        ("buyer2@sparehub.in", "buyer"),
        ("buyer3@sparehub.in", "buyer"),
        ("supplier1@sparehub.in", "supplier"),
        ("supplier2@sparehub.in", "supplier"),
        ("supplier3@sparehub.in", "supplier"),
        ("supplier4@sparehub.in", "supplier"),
        ("supplier5@sparehub.in", "supplier"),
    ]
    users = [User(email=email, password_hash="demo", role=role) for email, role in users_data]
    session.add_all(users)
    await session.flush()
    users_by_email = {user.email: user for user in users}

    buyers_data = [
        {
            "email": "buyer1@sparehub.in",
            "factory_name": "Navi Precision Forge",
            "industry_type": "Automotive Components",
            "delivery_address": "TTC Industrial Area, Navi Mumbai",
            "latitude": 19.0330,
            "longitude": 73.0297,
        },
        {
            "email": "buyer2@sparehub.in",
            "factory_name": "Thane Process Systems",
            "industry_type": "Process Automation",
            "delivery_address": "Wagle Estate, Thane",
            "latitude": 19.2075,
            "longitude": 72.9720,
        },
        {
            "email": "buyer3@sparehub.in",
            "factory_name": "Pune Packline Industries",
            "industry_type": "Packaging Machinery",
            "delivery_address": "Chakan MIDC, Pune",
            "latitude": 18.7506,
            "longitude": 73.8591,
        },
    ]
    buyers = []
    for row in buyers_data:
        profile = BuyerProfile(
            user_id=users_by_email[row["email"]].id,
            factory_name=row["factory_name"],
            industry_type=row["industry_type"],
            delivery_address=row["delivery_address"],
            latitude=row["latitude"],
            longitude=row["longitude"],
        )
        session.add(profile)
        buyers.append(profile)
    await session.flush()

    suppliers_data = [
        {
            "email": "supplier1@sparehub.in",
            "business_name": "Mumbai Industrial Supply Co.",
            "warehouse_address": "Andheri East, Mumbai",
            "gst_number": "27AAACM0001Z1",
            "service_radius_km": 220,
            "latitude": 19.0760,
            "longitude": 72.8777,
            "reliability_score": 0.82,
        },
        {
            "email": "supplier2@sparehub.in",
            "business_name": "Pune Precision Spares",
            "warehouse_address": "Chakan MIDC, Pune",
            "gst_number": "27AAACP0002Z2",
            "service_radius_km": 200,
            "latitude": 18.7590,
            "longitude": 73.8590,
            "reliability_score": 0.78,
        },
        {
            "email": "supplier3@sparehub.in",
            "business_name": "Ahmedabad Bearings Ltd.",
            "warehouse_address": "Sanand GIDC, Ahmedabad",
            "gst_number": "24AAACA0003Z3",
            "service_radius_km": 260,
            "latitude": 23.0225,
            "longitude": 72.5714,
            "reliability_score": 0.74,
        },
        {
            "email": "supplier4@sparehub.in",
            "business_name": "Chennai Mechatronics",
            "warehouse_address": "Ambattur, Chennai",
            "gst_number": "33AAACC0004Z4",
            "service_radius_km": 300,
            "latitude": 13.0827,
            "longitude": 80.2707,
            "reliability_score": 0.81,
        },
        {
            "email": "supplier5@sparehub.in",
            "business_name": "Bengaluru Motion Systems",
            "warehouse_address": "Peenya, Bengaluru",
            "gst_number": "29AAACB0005Z5",
            "service_radius_km": 240,
            "latitude": 12.9716,
            "longitude": 77.5946,
            "reliability_score": 0.76,
        },
    ]
    suppliers = []
    for row in suppliers_data:
        profile = SupplierProfile(
            user_id=users_by_email[row["email"]].id,
            business_name=row["business_name"],
            warehouse_address=row["warehouse_address"],
            gst_number=row["gst_number"],
            service_radius_km=row["service_radius_km"],
            latitude=row["latitude"],
            longitude=row["longitude"],
            reliability_score=row["reliability_score"],
        )
        session.add(profile)
        suppliers.append(profile)
    await session.flush()

    return {
        "users_by_email": users_by_email,
        "buyers_by_name": {buyer.factory_name: buyer for buyer in buyers},
        "suppliers_by_name": {supplier.business_name: supplier for supplier in suppliers},
    }


async def seed_inventory(session, suppliers_by_name: Dict[str, SupplierProfile]) -> Dict[str, object]:
    categories_data = [
        ("Bearings", "Deep Groove"),
        ("Electrical", "Power Electronics"),
        ("Hydraulics", "Hoses"),
        ("Pneumatics", "Valves"),
        ("Belts", "Power Transmission"),
        ("Filters", "Fuel Filters"),
        ("Automation", "PLC"),
        ("Sensors", "Photoelectric"),
        ("Motors", "VFD"),
        ("Fasteners", "Industrial Fasteners"),
    ]
    categories = [PartCategory(name=name, subcategory=subcategory) for name, subcategory in categories_data]
    session.add_all(categories)
    await session.flush()
    categories_by_name = {category.name: category for category in categories}

    inventory_rows: List[Tuple[str, str, str, str, str, float, int, int, int]] = [
        ("Mumbai Industrial Supply Co.", "Bearings", "Deep Groove Bearing", "6205-2RS", "SKF", 240.0, 60, 2, 16),
        ("Mumbai Industrial Supply Co.", "Bearings", "Deep Groove Bearing", "SKF-6203", "SKF", 185.0, 70, 2, 18),
        ("Mumbai Industrial Supply Co.", "Electrical", "Power MOSFET", "IRF540N", "Infineon", 38.0, 120, 5, 12),
        ("Mumbai Industrial Supply Co.", "Electrical", "DC-DC Converter", "LM2596S", "TI", 54.0, 80, 5, 14),
        ("Mumbai Industrial Supply Co.", "Belts", "V Belt", "GATES-A42", "Gates", 155.0, 20, 3, 10),
        ("Mumbai Industrial Supply Co.", "Filters", "Fuel Filter", "BOSCH-0451103316", "Bosch", 615.0, 40, 2, 24),
        ("Mumbai Industrial Supply Co.", "Pneumatics", "Solenoid Valve", "FESTO-CPV14", "Festo", 880.0, 15, 2, 30),
        ("Mumbai Industrial Supply Co.", "Hydraulics", "Hydraulic Hose", "PARKER-2H395", "Parker", 990.0, 18, 2, 28),
        ("Mumbai Industrial Supply Co.", "Sensors", "Photoelectric Sensor", "OMRON-E3Z", "Omron", 1650.0, 35, 1, 20),
        ("Mumbai Industrial Supply Co.", "Automation", "PLC Controller", "SIEMENS-S7-1200", "Siemens", 28800.0, 12, 1, 36),
        ("Pune Precision Spares", "Bearings", "Deep Groove Bearing", "6205-2RS", "NSK", 228.0, 55, 2, 12),
        ("Pune Precision Spares", "Electrical", "Power MOSFET", "IRF540N", "IR", 41.0, 90, 5, 14),
        ("Pune Precision Spares", "Electrical", "DC-DC Converter", "LM2596S", "TI", 52.0, 65, 5, 10),
        ("Pune Precision Spares", "Pneumatics", "Solenoid Valve", "FESTO-CPV14", "Festo", 835.0, 22, 2, 20),
        ("Pune Precision Spares", "Hydraulics", "Hydraulic Hose", "PARKER-2H395", "Parker", 960.0, 20, 2, 22),
        ("Pune Precision Spares", "Hydraulics", "Proportional Valve", "REXROTH-4WRPEH10C4", "Bosch Rexroth", 24500.0, 2, 1, 18),
        ("Pune Precision Spares", "Motors", "VFD Controller", "ABB-ACS355", "ABB", 23500.0, 8, 1, 40),
        ("Pune Precision Spares", "Sensors", "Photoelectric Sensor", "OMRON-E3Z", "Omron", 1700.0, 30, 1, 16),
        ("Pune Precision Spares", "Fasteners", "Hex Bolt SS304", "M12-BOLT-SS304", "Unbrako", 12.0, 500, 50, 8),
        ("Pune Precision Spares", "Sensors", "Safety Sensor", "PILZ-PSENMAG", "Pilz", 6200.0, 10, 1, 26),
        ("Ahmedabad Bearings Ltd.", "Bearings", "Deep Groove Bearing", "6205-2RS", "SKF", 236.0, 65, 2, 20),
        ("Ahmedabad Bearings Ltd.", "Bearings", "Deep Groove Bearing", "SKF-6203", "SKF", 178.0, 90, 2, 18),
        ("Ahmedabad Bearings Ltd.", "Belts", "V Belt", "GATES-A42", "Gates", 149.0, 40, 3, 18),
        ("Ahmedabad Bearings Ltd.", "Filters", "Fuel Filter", "BOSCH-0451103316", "Bosch", 608.0, 50, 2, 20),
        ("Ahmedabad Bearings Ltd.", "Electrical", "DC-DC Converter", "LM2596S", "TI", 57.0, 40, 5, 22),
        ("Ahmedabad Bearings Ltd.", "Electrical", "Power MOSFET", "IRF540N", "Infineon", 35.0, 70, 5, 26),
        ("Ahmedabad Bearings Ltd.", "Bearings", "Deep Groove Bearing", "NSK-6310", "NSK", 690.0, 25, 1, 30),
        ("Ahmedabad Bearings Ltd.", "Automation", "PLC Controller", "SIEMENS-S7-1200", "Siemens", 29900.0, 7, 1, 48),
        ("Ahmedabad Bearings Ltd.", "Pneumatics", "Solenoid Valve", "FESTO-CPV14", "Festo", 870.0, 10, 2, 32),
        ("Ahmedabad Bearings Ltd.", "Fasteners", "Hex Bolt SS304", "M12-BOLT-SS304", "Unbrako", 10.0, 400, 50, 12),
        ("Chennai Mechatronics", "Bearings", "Deep Groove Bearing", "6205-2RS", "SKF", 248.0, 45, 2, 22),
        ("Chennai Mechatronics", "Bearings", "Deep Groove Bearing", "SKF-6203", "SKF", 190.0, 50, 2, 20),
        ("Chennai Mechatronics", "Electrical", "DC-DC Converter", "LM2596S", "TI", 56.0, 70, 5, 18),
        ("Chennai Mechatronics", "Electrical", "Power MOSFET", "IRF540N", "IR", 37.0, 95, 5, 20),
        ("Chennai Mechatronics", "Belts", "V Belt", "GATES-A42", "Gates", 160.0, 30, 3, 22),
        ("Chennai Mechatronics", "Hydraulics", "Hydraulic Hose", "PARKER-2H395", "Parker", 1015.0, 25, 2, 26),
        ("Chennai Mechatronics", "Motors", "VFD Controller", "ABB-ACS355", "ABB", 23800.0, 9, 1, 36),
        ("Chennai Mechatronics", "Sensors", "Photoelectric Sensor", "OMRON-E3Z", "Omron", 1680.0, 25, 1, 20),
        ("Chennai Mechatronics", "Filters", "Fuel Filter", "BOSCH-0451103316", "Bosch", 625.0, 35, 2, 24),
        ("Chennai Mechatronics", "Pneumatics", "Solenoid Valve", "FESTO-CPV14", "Festo", 890.0, 16, 2, 24),
        ("Bengaluru Motion Systems", "Bearings", "Deep Groove Bearing", "6205-2RS", "FAG", 242.0, 58, 2, 18),
        ("Bengaluru Motion Systems", "Bearings", "Deep Groove Bearing", "SKF-6203", "SKF", 182.0, 72, 2, 16),
        ("Bengaluru Motion Systems", "Electrical", "DC-DC Converter", "LM2596S", "TI", 51.0, 60, 5, 14),
        ("Bengaluru Motion Systems", "Electrical", "Power MOSFET", "IRF540N", "IR", 39.0, 88, 5, 16),
        ("Bengaluru Motion Systems", "Belts", "V Belt", "GATES-A42", "Gates", 152.0, 28, 3, 16),
        ("Bengaluru Motion Systems", "Filters", "Fuel Filter", "BOSCH-0451103316", "Bosch", 612.0, 30, 2, 22),
        ("Bengaluru Motion Systems", "Hydraulics", "Hydraulic Hose", "PARKER-2H395", "Parker", 995.0, 22, 2, 24),
        ("Bengaluru Motion Systems", "Motors", "VFD Controller", "ABB-ACS355", "ABB", 22900.0, 11, 1, 34),
        ("Bengaluru Motion Systems", "Sensors", "Photoelectric Sensor", "OMRON-E3Z", "Omron", 1640.0, 27, 1, 18),
        ("Bengaluru Motion Systems", "Pneumatics", "Solenoid Valve", "FESTO-CPV14", "Festo", 850.0, 18, 2, 22),
    ]

    catalog_entries: List[PartsCatalog] = []
    for supplier_name, category_name, part_name, part_number, brand, price, stock, min_qty, lead in inventory_rows:
        entry = PartsCatalog(
            supplier_id=suppliers_by_name[supplier_name].id,
            category_id=categories_by_name[category_name].id,
            part_name=part_name,
            part_number=part_number,
            normalized_part_number=normalize_part_number(part_number),
            brand=brand,
            unit_price=price,
            quantity_in_stock=stock,
            min_order_quantity=min_qty,
            lead_time_hours=lead,
        )
        session.add(entry)
        catalog_entries.append(entry)
    await session.flush()

    return {
        "categories_by_name": categories_by_name,
        "catalog_entries": catalog_entries,
    }


async def seed_orders(session, buyers_by_name: Dict[str, BuyerProfile], categories_by_name: Dict[str, PartCategory]) -> Dict[str, object]:
    now = datetime.now(timezone.utc)
    orders_meta = [
        ("A", "Pune Packline Industries", "standard", now + timedelta(hours=72)),
        ("B", "Navi Precision Forge", "urgent", now + timedelta(hours=28)),
        ("C", "Navi Precision Forge", "critical", now + timedelta(hours=10)),
        ("D", "Thane Process Systems", "standard", now + timedelta(hours=48)),
        ("E", "Pune Packline Industries", "standard", now + timedelta(hours=56)),
        ("F", "Navi Precision Forge", "urgent", now + timedelta(hours=30)),
        ("G", "Thane Process Systems", "urgent", now + timedelta(hours=32)),
    ]

    orders: Dict[str, Order] = {}
    for code, buyer_name, urgency, required_at in orders_meta:
        order = Order(
            buyer_id=buyers_by_name[buyer_name].id,
            status="PLACED",
            urgency=urgency,
            required_delivery_date=required_at,
        )
        session.add(order)
        orders[code] = order
    await session.flush()

    items_meta: Dict[str, List[Tuple[str, str, int]]] = {
        "A": [("Bearings", "6205-2RS", 12)],
        "B": [("Hydraulics", "REXROTH-4WRPEH10C4", 1), ("Belts", "GATES-A42", 6)],
        "C": [("Electrical", "IRF540N", 30)],
        "D": [("Bearings", "SKF-6203", 15)],
        "E": [
            ("Hydraulics", "REXROTH-4WRPEH10C4", 1),
            ("Electrical", "LM2596S", 15),
            ("Pneumatics", "FESTO-CPV14", 2),
        ],
        "F": [("Belts", "GATES-A42", 5)],
        "G": [("Belts", "GATES-A42", 4)],
    }

    items_by_order: Dict[str, List[OrderItem]] = {code: [] for code in orders}
    for code, order_items in items_meta.items():
        for category_name, part_number, quantity in order_items:
            item = OrderItem(
                order_id=orders[code].id,
                category_id=categories_by_name[category_name].id,
                part_number=part_number,
                part_description=f"Demo requirement for {part_number}",
                quantity=quantity,
                status="PENDING",
            )
            session.add(item)
            items_by_order[code].append(item)
    await session.flush()

    return {
        "orders": orders,
        "items_by_order": items_by_order,
    }


async def create_dashboard_placed_order(
    session,
    buyers_by_name: Dict[str, BuyerProfile],
    categories_by_name: Dict[str, PartCategory],
) -> Order:
    order = Order(
        buyer_id=buyers_by_name["Thane Process Systems"].id,
        status="PLACED",
        urgency="standard",
        required_delivery_date=datetime.now(timezone.utc) + timedelta(hours=40),
    )
    session.add(order)
    await session.flush()

    session.add(
        OrderItem(
            order_id=order.id,
            category_id=categories_by_name["Bearings"].id,
            part_number="6205-2RS",
            part_description="Dashboard runnable order for matching demo",
            quantity=6,
            status="PENDING",
        )
    )
    await session.commit()
    return order


async def run_matching(session, order_codes: Sequence[str], orders: Dict[str, Order], admin_user_id: int) -> None:
    for code in order_codes:
        await match_full_order(
            session=session,
            order_id=orders[code].id,
            simulate=False,
            changed_by_user_id=admin_user_id,
        )


async def assignments_by_order(session, orders: Dict[str, Order]) -> Dict[str, List[OrderAssignment]]:
    mapping: Dict[str, List[OrderAssignment]] = {}
    for code, order in orders.items():
        rows = (
            await session.execute(
                select(OrderAssignment)
                .join(OrderItem, OrderItem.id == OrderAssignment.order_item_id)
                .where(OrderItem.order_id == order.id)
                .order_by(OrderAssignment.id.asc())
            )
        ).scalars().all()
        mapping[code] = rows
    return mapping


async def create_notifications_from_events(session) -> int:
    events = (
        await session.execute(select(EventLog).order_by(EventLog.id.asc()))
    ).scalars().all()
    notifications_created = 0
    for event in events:
        payload = {}
        if event.payload:
            try:
                payload = json.loads(event.payload)
            except json.JSONDecodeError:
                payload = {}
        target_user_ids = payload.get("target_user_ids") or []
        if not isinstance(target_user_ids, list):
            continue

        title, message = _status_label(event.event_type)
        for user_id in target_user_ids:
            if not isinstance(user_id, int):
                continue
            session.add(
                Notification(
                    user_id=user_id,
                    event_type=event.event_type,
                    title=title,
                    message=message,
                    metadata_json=json.dumps(
                        {
                            "event_id": event.id,
                            "entity_type": event.entity_type,
                            "entity_id": event.entity_id,
                        }
                    ),
                )
            )
            notifications_created += 1
    await session.commit()
    return notifications_created


async def ensure_meaningful_analytics(session) -> None:
    snapshot = await get_full_snapshot(session, timeline_days=30)
    checks = {
        "total_orders": snapshot["overview"]["total_orders"] > 0,
        "deliveries": snapshot["deliveries"]["total_deliveries"] > 0,
        "matching_items": snapshot["matching"]["total_items_scored"] > 0,
        "supplier_rows": len(snapshot["suppliers"]) > 0,
        "events": len(snapshot["events"]) > 0,
        "revenue": snapshot["overview"]["total_revenue_inr"] > 0,
    }
    failed = [key for key, ok in checks.items() if not ok]
    if failed:
        raise RuntimeError(f"Analytics snapshot has empty sections: {failed}")


async def seed_demo() -> None:
    progress("Resetting database")
    await reset_database()
    done()

    async with AsyncSessionLocal() as session:
        progress("Creating users and profiles")
        principal_data = await seed_users_profiles(session)
        await session.commit()
        done()

        users_by_email: Dict[str, User] = principal_data["users_by_email"]  # type: ignore[assignment]
        buyers_by_name: Dict[str, BuyerProfile] = principal_data["buyers_by_name"]  # type: ignore[assignment]
        suppliers_by_name: Dict[str, SupplierProfile] = principal_data["suppliers_by_name"]  # type: ignore[assignment]

        progress("Seeding inventory catalog")
        inventory_data = await seed_inventory(session, suppliers_by_name)
        await session.commit()
        done()

        categories_by_name: Dict[str, PartCategory] = inventory_data["categories_by_name"]  # type: ignore[assignment]

        progress("Creating demo orders A-G")
        orders_data = await seed_orders(session, buyers_by_name, categories_by_name)
        await session.commit()
        done()

        orders: Dict[str, Order] = orders_data["orders"]  # type: ignore[assignment]
        admin_user_id = users_by_email["admin@sparehub.in"].id

        progress("Running matching for all PLACED orders")
        await run_matching(session, ["A", "B", "C", "D", "E", "F", "G"], orders, admin_user_id)
        done()

        progress("Confirming assignments and updating inventory")
        confirm_a = await confirm_order_assignments(session, orders["A"].id, changed_by_user_id=admin_user_id)
        confirm_b = await confirm_order_assignments(session, orders["B"].id, changed_by_user_id=admin_user_id)
        confirm_c = await confirm_order_assignments(session, orders["C"].id, changed_by_user_id=admin_user_id)
        confirm_e = await confirm_order_assignments(session, orders["E"].id, changed_by_user_id=admin_user_id)
        confirm_f = await confirm_order_assignments(session, orders["F"].id, changed_by_user_id=admin_user_id)
        confirm_g = await confirm_order_assignments(session, orders["G"].id, changed_by_user_id=admin_user_id)
        done()

        progress("Cancelling demo order D")
        await transition_order_status(
            session,
            orders["D"].id,
            to_status="CANCELLED",
            changed_by_user_id=admin_user_id,
            emit_event=True,
        )
        done()

        progress("Planning deliveries (single A/C + batched F/G)")
        single_a = await create_single_delivery(
            session=session,
            order_assignment_id=confirm_a["accepted_assignment_ids"][0],
            created_by_user_id=admin_user_id,
        )
        single_c = await create_single_delivery(
            session=session,
            order_assignment_id=confirm_c["accepted_assignment_ids"][0],
            created_by_user_id=admin_user_id,
        )
        batched = await create_batched_delivery(
            session=session,
            order_assignment_ids=[
                confirm_f["accepted_assignment_ids"][0],
                confirm_g["accepted_assignment_ids"][0],
            ],
            num_vehicles=2,
            created_by_user_id=admin_user_id,
        )
        done()

        progress("Updating delivery progress and ETAs")
        await update_delivery_status(
            session=session,
            delivery_id=single_a["id"],
            status="IN_PROGRESS",
            changed_by_user_id=admin_user_id,
        )
        await update_eta(session=session, delivery_id=single_a["id"], changed_by_user_id=admin_user_id)
        await update_delivery_status(
            session=session,
            delivery_id=single_a["id"],
            status="COMPLETED",
            changed_by_user_id=admin_user_id,
        )

        await update_delivery_status(
            session=session,
            delivery_id=single_c["id"],
            status="IN_PROGRESS",
            changed_by_user_id=admin_user_id,
        )
        await update_eta(session=session, delivery_id=single_c["id"], changed_by_user_id=admin_user_id)

        for batch_delivery in batched:
            await update_eta(
                session=session,
                delivery_id=batch_delivery["id"],
                changed_by_user_id=admin_user_id,
            )
        done()

        progress("Advancing order lifecycle states")
        # A -> DELIVERED (delivery completed)
        await transition_order_status(session, orders["A"].id, "DISPATCHED", admin_user_id, emit_event=True)
        await transition_order_status(session, orders["A"].id, "IN_TRANSIT", admin_user_id, emit_event=True)
        await transition_order_status(session, orders["A"].id, "DELIVERED", admin_user_id, emit_event=True)

        # B -> IN_TRANSIT
        await transition_order_status(session, orders["B"].id, "DISPATCHED", admin_user_id, emit_event=True)
        await transition_order_status(session, orders["B"].id, "IN_TRANSIT", admin_user_id, emit_event=True)

        # C -> DISPATCHED (delivery started, not yet complete)
        await transition_order_status(session, orders["C"].id, "DISPATCHED", admin_user_id, emit_event=True)

        # E remains CONFIRMED (waiting dispatch)
        # F and G remain CONFIRMED to show planned batched optimization
        done()

        progress("Refreshing supplier reliability scores")
        for supplier in suppliers_by_name.values():
            await update_reliability_score(session, supplier.id)
        done()

        progress("Creating notification history from event log")
        created_notifications = await create_notifications_from_events(session)
        done()

        progress("Creating one runnable PLACED order for dashboard testing")
        await create_dashboard_placed_order(session, buyers_by_name, categories_by_name)
        done()

        progress("Validating analytics snapshot completeness")
        await ensure_meaningful_analytics(session)
        done()

        orders_count = (
            await session.execute(select(Order))
        ).scalars().all()
        deliveries_count = (
            await session.execute(select(Delivery))
        ).scalars().all()
        events_count = (
            await session.execute(select(EventLog))
        ).scalars().all()
        low_stock_txns = (
            await session.execute(
                select(InventoryTransaction).where(InventoryTransaction.reason == "order_confirmed")
            )
        ).scalars().all()

        print("")
        print("Demo seed completed.")
        print(f"- Orders: {len(orders_count)}")
        print(f"- Deliveries: {len(deliveries_count)}")
        print(f"- Event logs: {len(events_count)}")
        print(f"- Inventory confirmations: {len(low_stock_txns)}")
        print(f"- Notifications: {created_notifications}")


if __name__ == "__main__":
    os.environ.setdefault("ALLOW_UNAUTHENTICATED", "true")
    asyncio.run(seed_demo())
