import asyncio
import importlib
import inspect
import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List

from sqlalchemy import delete, func, select

from backend.database import AsyncSessionLocal, init_db
from backend.models.inventory import PartCategory, PartsCatalog
from backend.models.order import Order, OrderAssignment, OrderItem, OrderStatusHistory
from backend.models.users import BuyerProfile, SupplierProfile, User
from backend.schemas.order import OrderCreate, OrderItemCreate
from backend.services.inventory_service import normalize_part_number
from backend.services.order_service import (
    assign_supplier_to_item,
    cancel_order,
    confirm_assignment,
    create_order,
    transition_item_status,
)


async def _run_optional_seed_step(step_name: str, candidates: List[str]) -> None:
    """
    Execute optional seed hooks from other merged module branches if available.
    Candidate format: "module.path:function_name".
    """
    for candidate in candidates:
        module_name, fn_name = candidate.rsplit(":", 1)
        try:
            module = importlib.import_module(module_name)
        except Exception:  # noqa: BLE001
            continue
        func = getattr(module, fn_name, None)
        if not callable(func):
            continue

        signature = inspect.signature(func)
        kwargs: Dict[str, Any] = {}
        if "session" in signature.parameters:
            async with AsyncSessionLocal() as session:
                kwargs["session"] = session
                result = func(**kwargs)
                if inspect.isawaitable(result):
                    await result
                else:
                    result
            return

        result = func(**kwargs)
        if inspect.isawaitable(result):
            await result
        else:
            result
        return


async def _ensure_categories(session) -> Dict[str, PartCategory]:
    categories = [
        "Bearings",
        "Motors",
        "Pumps",
        "Valves",
        "Hydraulic Components",
        "Seals",
        "Gears",
        "Belts & Chains",
        "Electrical Components",
        "Filters",
    ]

    category_map: Dict[str, PartCategory] = {}
    for name in categories:
        result = await session.execute(select(PartCategory).where(PartCategory.name == name))
        category = result.scalar_one_or_none()
        if not category:
            category = PartCategory(name=name, subcategory=None)
            session.add(category)
            await session.flush()
        category_map[name] = category

    return category_map


async def _ensure_suppliers(session) -> List[SupplierProfile]:
    suppliers_seed = [
        {
            "email": "mumbai.supplier@example.com",
            "business_name": "Mumbai Bearings Co",
            "warehouse_address": "Andheri East, Mumbai, Maharashtra",
            "gst_number": "27AABCM1234F1Z5",
            "latitude": 19.0760,
            "longitude": 72.8777,
        },
        {
            "email": "pune.supplier@example.com",
            "business_name": "Pune Industrial Spares",
            "warehouse_address": "Hinjewadi, Pune, Maharashtra",
            "gst_number": "27AAACP5678G1Z2",
            "latitude": 18.5204,
            "longitude": 73.8567,
        },
        {
            "email": "ahmedabad.supplier@example.com",
            "business_name": "Ahmedabad Motors & Pumps",
            "warehouse_address": "Vatva, Ahmedabad, Gujarat",
            "gst_number": "24AAACA9012H1Z6",
            "latitude": 23.0225,
            "longitude": 72.5714,
        },
        {
            "email": "chennai.supplier@example.com",
            "business_name": "Chennai Valve Depot",
            "warehouse_address": "Ambattur, Chennai, Tamil Nadu",
            "gst_number": "33AAACV3456K1Z3",
            "latitude": 13.0827,
            "longitude": 80.2707,
        },
        {
            "email": "bengaluru.supplier@example.com",
            "business_name": "Bengaluru Industrial Bearings",
            "warehouse_address": "Peenya, Bengaluru, Karnataka",
            "gst_number": "29AAACB7890L1Z1",
            "latitude": 12.9716,
            "longitude": 77.5946,
        },
    ]

    supplier_profiles: List[SupplierProfile] = []
    for idx, data in enumerate(suppliers_seed, start=1):
        user_result = await session.execute(select(User).where(User.email == data["email"]))
        user = user_result.scalar_one_or_none()
        if not user:
            user = User(
                email=data["email"],
                password_hash="hashed_password",
                role="supplier",
                is_active=True,
            )
            session.add(user)
            await session.flush()

        profile_result = await session.execute(
            select(SupplierProfile).where(SupplierProfile.user_id == user.id)
        )
        profile = profile_result.scalar_one_or_none()
        if not profile:
            profile = SupplierProfile(
                user_id=user.id,
                business_name=data["business_name"],
                warehouse_address=data["warehouse_address"],
                gst_number=data["gst_number"],
                service_radius_km=120,
                latitude=data["latitude"],
                longitude=data["longitude"],
                reliability_score=round(0.6 + (idx * 0.05), 2),
            )
            session.add(profile)
            await session.flush()

        supplier_profiles.append(profile)

    return supplier_profiles


async def _ensure_buyers(session) -> List[BuyerProfile]:
    buyers_seed = [
        {
            "email": "pune.buyer@example.com",
            "factory_name": "Pune Auto Components Plant",
            "industry_type": "Automotive",
            "delivery_address": "Chakan MIDC, Pune, Maharashtra",
            "latitude": 18.7593,
            "longitude": 73.8638,
        },
        {
            "email": "nashik.buyer@example.com",
            "factory_name": "Nashik Precision Engineering Works",
            "industry_type": "Heavy Engineering",
            "delivery_address": "Satpur MIDC, Nashik, Maharashtra",
            "latitude": 19.9975,
            "longitude": 73.7898,
        },
        {
            "email": "vadodara.buyer@example.com",
            "factory_name": "Vadodara Process Industries",
            "industry_type": "Chemical Processing",
            "delivery_address": "Makarpura GIDC, Vadodara, Gujarat",
            "latitude": 22.3072,
            "longitude": 73.1812,
        },
        {
            "email": "hosur.buyer@example.com",
            "factory_name": "Hosur Manufacturing Hub",
            "industry_type": "Industrial Machinery",
            "delivery_address": "SIPCOT Industrial Area, Hosur, Tamil Nadu",
            "latitude": 12.7409,
            "longitude": 77.8253,
        },
    ]

    buyer_profiles: List[BuyerProfile] = []
    for data in buyers_seed:
        user_result = await session.execute(select(User).where(User.email == data["email"]))
        user = user_result.scalar_one_or_none()
        if not user:
            user = User(
                email=data["email"],
                password_hash="hashed_password",
                role="buyer",
                is_active=True,
            )
            session.add(user)
            await session.flush()

        profile_result = await session.execute(
            select(BuyerProfile).where(BuyerProfile.user_id == user.id)
        )
        profile = profile_result.scalar_one_or_none()
        if not profile:
            profile = BuyerProfile(
                user_id=user.id,
                factory_name=data["factory_name"],
                industry_type=data["industry_type"],
                delivery_address=data["delivery_address"],
                latitude=data["latitude"],
                longitude=data["longitude"],
            )
            session.add(profile)
            await session.flush()

        buyer_profiles.append(profile)

    return buyer_profiles


async def _ensure_inventory(
    session,
    category_map: Dict[str, PartCategory],
    supplier_profiles: List[SupplierProfile],
) -> None:
    existing = await session.execute(select(func.count(PartsCatalog.id)))
    if existing.scalar_one() > 0:
        return

    parts_master = [
        {
            "category": "Bearings",
            "part_name": "Ball Bearing - 6205 ZZ",
            "part_number": "6205 ZZ",
            "brand": "SKF",
            "price_range": (200, 800),
        },
        {
            "category": "Bearings",
            "part_name": "Ball Bearing - 6205 BB",
            "part_number": "6205 BB",
            "brand": "NSK",
            "price_range": (220, 780),
        },
        {
            "category": "Bearings",
            "part_name": "Deep Groove Bearing 6206",
            "part_number": "6206",
            "brand": "FAG",
            "price_range": (250, 820),
        },
        {
            "category": "Bearings",
            "part_name": "Deep Groove Bearing 6207",
            "part_number": "6207",
            "brand": "SKF",
            "price_range": (260, 840),
        },
        {
            "category": "Bearings",
            "part_name": "Deep Groove Bearing 6305",
            "part_number": "6305",
            "brand": "NTN",
            "price_range": (240, 860),
        },
        {
            "category": "Bearings",
            "part_name": "Taper Roller Bearing 32205",
            "part_number": "32205",
            "brand": "SKF",
            "price_range": (380, 900),
        },
        {
            "category": "Bearings",
            "part_name": "Cylindrical Roller Bearing NU205",
            "part_number": "NU205",
            "brand": "FAG",
            "price_range": (360, 950),
        },
        {
            "category": "Motors",
            "part_name": "ABB M2AA 90 Motor",
            "part_number": "ABB-M2AA-090",
            "brand": "ABB",
            "price_range": (15000, 45000),
        },
        {
            "category": "Motors",
            "part_name": "Siemens 1LE1 Motor",
            "part_number": "Siemens-1LE1",
            "brand": "Siemens",
            "price_range": (18000, 42000),
        },
        {
            "category": "Motors",
            "part_name": "WEG W22 71 Motor",
            "part_number": "WEG-W22-71",
            "brand": "WEG",
            "price_range": (17000, 41000),
        },
        {
            "category": "Pumps",
            "part_name": "KSB ETA 50-200 Pump",
            "part_number": "KSB-ETA-50-200",
            "brand": "KSB",
            "price_range": (25000, 80000),
        },
        {
            "category": "Pumps",
            "part_name": "Grundfos CR 10-5 Pump",
            "part_number": "Grundfos-CR-10-5",
            "brand": "Grundfos",
            "price_range": (30000, 75000),
        },
        {
            "category": "Valves",
            "part_name": "Fisher ED Valve 4to20",
            "part_number": "Fisher-ED-4to20",
            "brand": "Fisher",
            "price_range": (22000, 60000),
        },
        {
            "category": "Valves",
            "part_name": "Honeywell V5011N Valve",
            "part_number": "Honeywell-V5011N",
            "brand": "Honeywell",
            "price_range": (18000, 55000),
        },
        {
            "category": "Hydraulic Components",
            "part_name": "Parker Hydraulic Seal Kit",
            "part_number": "Parker-HYD-220",
            "brand": "Parker",
            "price_range": (1200, 4500),
        },
        {
            "category": "Seals",
            "part_name": "SKF Oil Seal 45x62x8",
            "part_number": "SKF-OS-45x62x8",
            "brand": "SKF",
            "price_range": (300, 900),
        },
        {
            "category": "Gears",
            "part_name": "Helical Gear HG30",
            "part_number": "HG-30",
            "brand": "Elecon",
            "price_range": (3500, 12000),
        },
        {
            "category": "Belts & Chains",
            "part_name": "V-Belt B54",
            "part_number": "V-BELT-B54",
            "brand": "Fenner",
            "price_range": (800, 2200),
        },
        {
            "category": "Electrical Components",
            "part_name": "Siemens Contactor 3RT1016",
            "part_number": "Siemens-3RT1016",
            "brand": "Siemens",
            "price_range": (2500, 9000),
        },
        {
            "category": "Filters",
            "part_name": "Donaldson Hydraulic Filter P181038",
            "part_number": "Donaldson-P181038",
            "brand": "Donaldson",
            "price_range": (900, 3000),
        },
    ]

    random.seed(42)
    for supplier in supplier_profiles:
        selection = random.sample(parts_master, k=random.randint(8, 15))
        for part in selection:
            price = round(random.uniform(*part["price_range"]), 2)
            quantity = random.choice([2, 4, 6, 8, 15, 20, 35, 50])
            min_order = random.choice([1, 2, 3, 5])
            lead_time = random.choice([4, 8, 12, 24, 36, 48, 72])

            entry = PartsCatalog(
                supplier_id=supplier.id,
                category_id=category_map[part["category"]].id,
                part_name=part["part_name"],
                part_number=part["part_number"],
                normalized_part_number=normalize_part_number(part["part_number"]),
                brand=part["brand"],
                unit_price=price,
                quantity_in_stock=quantity,
                min_order_quantity=min_order,
                lead_time_hours=lead_time,
            )
            session.add(entry)

    await session.commit()


async def _find_catalog_for_part(
    session,
    part_number: str,
    required_quantity: int,
) -> PartsCatalog:
    result = await session.execute(
        select(PartsCatalog)
        .where(PartsCatalog.part_number == part_number)
        .where(PartsCatalog.quantity_in_stock >= required_quantity)
        .order_by(PartsCatalog.quantity_in_stock.desc())
    )
    catalog = result.scalars().first()
    if catalog:
        return catalog

    fallback_result = await session.execute(
        select(PartsCatalog)
        .where(PartsCatalog.part_number == part_number)
        .order_by(PartsCatalog.quantity_in_stock.desc())
    )
    catalog = fallback_result.scalars().first()
    if not catalog:
        raise RuntimeError(f"Missing catalog entry for {part_number}")
    catalog.quantity_in_stock = max(catalog.quantity_in_stock, required_quantity + 20)
    await session.flush()
    return catalog


async def _seed_orders(
    session,
    category_map: Dict[str, PartCategory],
    buyers: List[BuyerProfile],
) -> None:
    existing_orders = await session.execute(select(func.count(Order.id)))
    existing_count = existing_orders.scalar_one()
    if existing_count == 7:
        return
    if existing_count > 0:
        await session.execute(delete(OrderStatusHistory))
        await session.execute(delete(OrderAssignment))
        await session.execute(delete(OrderItem))
        await session.execute(delete(Order))
        await session.commit()

    buyer_users = [
        {"user_id": buyer.user_id, "role": "buyer"}
        for buyer in buyers
    ]

    order_specs = [
        {
            "buyer_index": 0,
            "urgency": "standard",
            "days": 3,
            "items": [
                ("Bearings", "6205 BB", "Ball bearing for conveyor drive", 10),
                ("Seals", "SKF-OS-45x62x8", "Pump shaft oil seal", 4),
            ],
            "state": "PLACED",
        },
        {
            "buyer_index": 1,
            "urgency": "urgent",
            "days": 1,
            "items": [
                ("Pumps", "Grundfos-CR-10-5", "Boiler feed auxiliary pump", 1),
            ],
            "state": "PLACED",
        },
        {
            "buyer_index": 2,
            "urgency": "urgent",
            "days": 2,
            "items": [
                ("Bearings", "6205 ZZ", "Agitator line bearing replacement", 20),
                ("Valves", "Honeywell-V5011N", "Steam line control valve", 1),
            ],
            "state": "MATCHED",
        },
        {
            "buyer_index": 3,
            "urgency": "critical",
            "days": 1,
            "items": [
                ("Motors", "ABB-M2AA-090", "Compressor drive motor", 1),
                ("Bearings", "32205", "Compressor bearing support", 6),
            ],
            "state": "CONFIRMED",
        },
        {
            "buyer_index": 0,
            "urgency": "standard",
            "days": 4,
            "items": [
                ("Valves", "Fisher-ED-4to20", "Pressure control replacement", 1),
                ("Bearings", "6206", "Gearbox line bearing", 12),
            ],
            "state": "CONFIRMED",
        },
        {
            "buyer_index": 1,
            "urgency": "standard",
            "days": -2,
            "items": [
                ("Bearings", "6207", "Past order bearing replacement", 8),
                ("Pumps", "KSB-ETA-50-200", "Process circulation pump", 1),
            ],
            "state": "DELIVERED",
        },
        {
            "buyer_index": 2,
            "urgency": "urgent",
            "days": 2,
            "items": [
                ("Motors", "WEG-W22-71", "Backup motor requirement", 1),
                ("Bearings", "6305", "Motor mount bearings", 10),
            ],
            "state": "CANCELLED",
        },
    ]

    for spec in order_specs:
        buyer = buyers[spec["buyer_index"]]
        buyer_user = buyer_users[spec["buyer_index"]]

        required_date = datetime.now(timezone.utc) + timedelta(days=spec["days"])
        payload = OrderCreate(
            urgency=spec["urgency"],
            required_delivery_date=required_date,
            items=[
                OrderItemCreate(
                    category_id=category_map[category].id,
                    part_number=part_number,
                    part_description=description,
                    quantity=quantity,
                )
                for category, part_number, description, quantity in spec["items"]
            ],
        )

        order = await create_order(session, buyer.id, payload, changed_by=buyer.user_id)

        if spec["state"] == "PLACED":
            continue

        assignments = []
        for item in order.items:
            catalog = await _find_catalog_for_part(session, item.part_number, item.quantity)
            assignment = await assign_supplier_to_item(
                session,
                order_item_id=item.id,
                supplier_id=catalog.supplier_id,
                catalog_id=catalog.id,
                price=float(catalog.unit_price),
                score=round(random.uniform(0.72, 0.95), 3),
                changed_by=999,
            )
            assignments.append(assignment)

        if spec["state"] == "MATCHED":
            continue

        for assignment in assignments:
            supplier_result = await session.execute(
                select(SupplierProfile).where(SupplierProfile.id == assignment.supplier_id)
            )
            supplier = supplier_result.scalar_one()
            supplier_user = {"user_id": supplier.user_id, "role": "supplier"}
            await confirm_assignment(session, assignment.id, supplier_user)

        if spec["state"] == "CONFIRMED":
            continue

        if spec["state"] == "DELIVERED":
            for item in order.items:
                admin_user = {"user_id": 999, "role": "admin"}
                await transition_item_status(session, item.id, "DISPATCHED", admin_user)
                await transition_item_status(session, item.id, "IN_TRANSIT", admin_user)
                await transition_item_status(session, item.id, "DELIVERED", admin_user)
            continue

        if spec["state"] == "CANCELLED":
            await cancel_order(session, order.id, buyer_user)
            continue


async def seed() -> None:
    await init_db()
    async with AsyncSessionLocal() as session:
        # Step 1 (Module 1): users + profiles
        suppliers = await _ensure_suppliers(session)
        buyers = await _ensure_buyers(session)

        # Step 2 (Module 4): categories + catalog
        category_map = await _ensure_categories(session)
        await session.commit()
        await _ensure_inventory(session, category_map, suppliers)

        # Step 3 (Module 5): orders + items
        await _seed_orders(session, category_map, buyers)

    # Step 4 (Module 2): matching results + assignments
    await _run_optional_seed_step(
        "matching",
        [
            "backend.seed_matching:seed",
            "backend.seed_matching:seed_matching_data",
            "seed_matching:seed",
            "seed_matching:seed_matching_data",
        ],
    )
    # Step 5 (Module 3): deliveries + routes
    await _run_optional_seed_step(
        "deliveries",
        [
            "backend.seed_deliveries:seed",
            "backend.seed_deliveries:seed_delivery_data",
            "seed_deliveries:seed",
            "seed_deliveries:seed_delivery_data",
        ],
    )
    # Step 6 (Module 6): notifications
    await _run_optional_seed_step(
        "notifications",
        [
            "backend.seed_notifications:seed",
            "backend.seed_notifications:seed_notification_data",
            "seed_notifications:seed",
            "seed_notifications:seed_notification_data",
        ],
    )

    print("Seed data created or updated.")


if __name__ == "__main__":
    asyncio.run(seed())
