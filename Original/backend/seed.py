import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

import backend.models  # noqa: F401
from backend.database import AsyncSessionLocal, close_db, init_db
from backend.events.bus import emit_event
from backend.middleware.auth import hash_password
from backend.models.catalog import PartCategory, PartsCatalog
from backend.models.delivery import Delivery, DeliveryStop
from backend.models.events import NotificationTemplate
from backend.models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.services.matching_service import match_full_order, normalize_part_number
from backend.services.routing_service import create_single_delivery


# ── User data ────────────────────────────────────────────────────────────────

BUYERS = [
    {
        "email": "buyer.mumbai@sparehub.in",
        "password": "buyer123",
        "factory_name": "Mumbai Steelworks",
        "industry_type": "Steel fabrication",
        "delivery_address": "Andheri Industrial Estate, Mumbai, Maharashtra",
        "latitude": 19.076,
        "longitude": 72.8777,
    },
    {
        "email": "buyer.chennai@sparehub.in",
        "password": "buyer123",
        "factory_name": "Chennai Auto Components",
        "industry_type": "Automotive parts",
        "delivery_address": "Guindy Industrial Park, Chennai, Tamil Nadu",
        "latitude": 13.0827,
        "longitude": 80.2707,
    },
    {
        "email": "buyer.pune@sparehub.in",
        "password": "buyer123",
        "factory_name": "Pune Precision Tools",
        "industry_type": "Machine tooling",
        "delivery_address": "Chakan MIDC, Pune, Maharashtra",
        "latitude": 18.5204,
        "longitude": 73.8567,
    },
]

SUPPLIERS = [
    {
        "email": "supplier.thane@sparehub.in",
        "password": "supplier123",
        "business_name": "Thane Industrial Supplies",
        "warehouse_address": "Wagle Estate, Thane, Maharashtra",
        "gst_number": "27AAEPM0123C1Z5",
        "service_radius_km": 120,
        "latitude": 19.2183,
        "longitude": 72.9781,
    },
    {
        "email": "supplier.nashik@sparehub.in",
        "password": "supplier123",
        "business_name": "Nashik Bearings Hub",
        "warehouse_address": "Ambad MIDC, Nashik, Maharashtra",
        "gst_number": "27AAACN9786K1Z2",
        "service_radius_km": 150,
        "latitude": 20.0063,
        "longitude": 73.7895,
    },
    {
        "email": "supplier.coimbatore@sparehub.in",
        "password": "supplier123",
        "business_name": "Coimbatore Motors & Gears",
        "warehouse_address": "Peelamedu, Coimbatore, Tamil Nadu",
        "gst_number": "33AABCC0123D1Z8",
        "service_radius_km": 90,
        "latitude": 11.0168,
        "longitude": 76.9558,
    },
    {
        "email": "supplier.bangalore@sparehub.in",
        "password": "supplier123",
        "business_name": "Bengaluru Hydraulics",
        "warehouse_address": "Peenya Industrial Area, Bengaluru, Karnataka",
        "gst_number": "29AAACB1234E1Z9",
        "service_radius_km": 200,
        "latitude": 12.9716,
        "longitude": 77.5946,
    },
    {
        "email": "supplier.hyderabad@sparehub.in",
        "password": "supplier123",
        "business_name": "Hyderabad Fasteners Co",
        "warehouse_address": "Jeedimetla, Hyderabad, Telangana",
        "gst_number": "36AAACH5678F1Z3",
        "service_radius_km": 110,
        "latitude": 17.385,
        "longitude": 78.4867,
    },
]

CATEGORIES = [
    ("Bearings", "Deep Groove Ball Bearings"),
    ("Hydraulics", "Hydraulic Pumps"),
    ("Fasteners", "Industrial Bolts"),
    ("Power Transmission", "V-Belts"),
    ("Seals", "Oil Seals"),
    ("Gears", "Spur Gears"),
]


# ── Helpers ──────────────────────────────────────────────────────────────────


async def _ensure_user(session, *, email: str, role: str, password: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        return user
    user = User(email=email, password_hash=hash_password(password), role=role)
    session.add(user)
    await session.flush()
    return user


# ── 1. Users & Profiles ─────────────────────────────────────────────────────


async def seed_users_and_profiles() -> dict[str, User]:
    user_lookup: dict[str, User] = {}
    async with AsyncSessionLocal() as session:
        admin = await _ensure_user(
            session, email="admin@sparehub.in", role="admin", password="admin123"
        )
        user_lookup[admin.email] = admin

        for buyer in BUYERS:
            user = await _ensure_user(
                session,
                email=buyer["email"],
                role="buyer",
                password=buyer["password"],
            )
            profile_result = await session.execute(
                select(BuyerProfile).where(BuyerProfile.user_id == user.id)
            )
            if profile_result.scalar_one_or_none() is None:
                session.add(
                    BuyerProfile(
                        user_id=user.id,
                        factory_name=buyer["factory_name"],
                        industry_type=buyer["industry_type"],
                        delivery_address=buyer["delivery_address"],
                        latitude=buyer["latitude"],
                        longitude=buyer["longitude"],
                    )
                )
            user_lookup[user.email] = user

        for supplier in SUPPLIERS:
            user = await _ensure_user(
                session,
                email=supplier["email"],
                role="supplier",
                password=supplier["password"],
            )
            profile_result = await session.execute(
                select(SupplierProfile).where(SupplierProfile.user_id == user.id)
            )
            if profile_result.scalar_one_or_none() is None:
                session.add(
                    SupplierProfile(
                        user_id=user.id,
                        business_name=supplier["business_name"],
                        warehouse_address=supplier["warehouse_address"],
                        gst_number=supplier["gst_number"],
                        service_radius_km=supplier["service_radius_km"],
                        latitude=supplier["latitude"],
                        longitude=supplier["longitude"],
                    )
                )
            user_lookup[user.email] = user

        await session.commit()
    return user_lookup


# ── 2. Categories & Catalog (expanded to ~20 items) ─────────────────────────


async def seed_categories_and_catalog() -> dict[str, int]:
    category_lookup: dict[str, int] = {}
    async with AsyncSessionLocal() as session:
        for category_name, subcategory in CATEGORIES:
            result = await session.execute(
                select(PartCategory).where(
                    PartCategory.name == category_name,
                    PartCategory.subcategory == subcategory,
                )
            )
            category = result.scalar_one_or_none()
            if category is None:
                category = PartCategory(name=category_name, subcategory=subcategory)
                session.add(category)
                await session.flush()
            category_lookup[f"{category_name}:{subcategory}"] = category.id

        supplier_result = await session.execute(select(SupplierProfile))
        suppliers = supplier_result.scalars().all()
        suppliers_by_email: dict[str, SupplierProfile] = {}
        for supplier in suppliers:
            user_result = await session.execute(
                select(User).where(User.id == supplier.user_id)
            )
            user = user_result.scalar_one()
            suppliers_by_email[user.email] = supplier

        # (email, category_key, part_name, part_number, brand, price, qty, min_qty, lead_hours)
        catalog_seed = [
            # ── Thane Industrial Supplies ──
            (
                "supplier.thane@sparehub.in",
                "Bearings:Deep Groove Ball Bearings",
                "SKF 6205 Deep Groove Bearing",
                "SKF-6205",
                "SKF",
                425.0,
                120,
                1,
                18,
            ),
            (
                "supplier.thane@sparehub.in",
                "Fasteners:Industrial Bolts",
                "M10 Stainless Hex Bolt",
                "SS-HB-M10-50",
                "TATA",
                12.0,
                3000,
                25,
                8,
            ),
            (
                "supplier.thane@sparehub.in",
                "Seals:Oil Seals",
                "NOK TC Oil Seal 35x52x7",
                "NOK-TC-3552",
                "NOK",
                85.0,
                200,
                5,
                12,
            ),
            (
                "supplier.thane@sparehub.in",
                "Gears:Spur Gears",
                "Module 2 Spur Gear 40T",
                "SG-M2-40T",
                "KHK",
                780.0,
                3,
                1,
                48,
            ),  # LOW STOCK
            # ── Nashik Bearings Hub ──
            (
                "supplier.nashik@sparehub.in",
                "Hydraulics:Hydraulic Pumps",
                "Bosch Rexroth Hydraulic Pump A10VSO",
                "A10VSO-45DR",
                "Bosch Rexroth",
                12500.0,
                30,
                1,
                48,
            ),
            (
                "supplier.nashik@sparehub.in",
                "Bearings:Deep Groove Ball Bearings",
                "FAG 6310 Deep Groove Bearing",
                "FAG-6310",
                "FAG",
                680.0,
                65,
                1,
                16,
            ),
            (
                "supplier.nashik@sparehub.in",
                "Power Transmission:V-Belts",
                "Gates V-Belt A-68",
                "GATES-A68",
                "Gates",
                210.0,
                180,
                2,
                12,
            ),
            (
                "supplier.nashik@sparehub.in",
                "Seals:Oil Seals",
                "SKF Oil Seal HMS5 50x72x8",
                "SKF-HMS5-5072",
                "SKF",
                145.0,
                4,
                1,
                16,
            ),  # LOW STOCK
            # ── Coimbatore Motors & Gears ──
            (
                "supplier.coimbatore@sparehub.in",
                "Fasteners:Industrial Bolts",
                "M12 High Tensile Hex Bolt",
                "HTB-M12-75",
                "Unbrako",
                18.0,
                5000,
                50,
                10,
            ),
            (
                "supplier.coimbatore@sparehub.in",
                "Gears:Spur Gears",
                "Module 3 Spur Gear 60T",
                "SG-M3-60T",
                "KHK",
                1250.0,
                15,
                1,
                72,
            ),
            (
                "supplier.coimbatore@sparehub.in",
                "Bearings:Deep Groove Ball Bearings",
                "NTN 6208 Bearing",
                "NTN-6208",
                "NTN",
                380.0,
                90,
                1,
                14,
            ),
            (
                "supplier.coimbatore@sparehub.in",
                "Seals:Oil Seals",
                "Freudenberg Simmerring 40x62x10",
                "FR-SIM-4062",
                "Freudenberg",
                120.0,
                2,
                1,
                20,
            ),  # LOW STOCK
            # ── Bengaluru Hydraulics ──
            (
                "supplier.bangalore@sparehub.in",
                "Power Transmission:V-Belts",
                "ContiTech V-Belt B-72",
                "VB-B72",
                "ContiTech",
                260.0,
                340,
                2,
                16,
            ),
            (
                "supplier.bangalore@sparehub.in",
                "Hydraulics:Hydraulic Pumps",
                "Parker PGP505 Gear Pump",
                "PGP505-A",
                "Parker",
                8900.0,
                12,
                1,
                36,
            ),
            (
                "supplier.bangalore@sparehub.in",
                "Fasteners:Industrial Bolts",
                "M16 Flange Bolt Grade 10.9",
                "FB-M16-100",
                "Unbrako",
                32.0,
                1500,
                10,
                14,
            ),
            (
                "supplier.bangalore@sparehub.in",
                "Gears:Spur Gears",
                "Module 1.5 Spur Gear 30T",
                "SG-M15-30T",
                "KHK",
                520.0,
                25,
                1,
                40,
            ),
            # ── Hyderabad Fasteners Co ──
            (
                "supplier.hyderabad@sparehub.in",
                "Bearings:Deep Groove Ball Bearings",
                "NSK 6307 Bearing",
                "NSK-6307",
                "NSK",
                560.0,
                90,
                1,
                20,
            ),
            (
                "supplier.hyderabad@sparehub.in",
                "Fasteners:Industrial Bolts",
                "M8 Socket Head Cap Screw",
                "SHCS-M8-40",
                "Unbrako",
                8.0,
                8000,
                50,
                6,
            ),
            (
                "supplier.hyderabad@sparehub.in",
                "Power Transmission:V-Belts",
                "Optibelt V-Belt SPZ-1000",
                "OPT-SPZ1000",
                "Optibelt",
                320.0,
                5,
                1,
                24,
            ),  # LOW STOCK
            (
                "supplier.hyderabad@sparehub.in",
                "Hydraulics:Hydraulic Pumps",
                "Yuken A3H16 Piston Pump",
                "YUK-A3H16",
                "Yuken",
                15800.0,
                8,
                1,
                60,
            ),
        ]

        for record in catalog_seed:
            (
                supplier_email,
                category_key,
                part_name,
                part_number,
                brand,
                unit_price,
                qty,
                min_qty,
                lead_hours,
            ) = record
            supplier = suppliers_by_email[supplier_email]
            normalized = normalize_part_number(part_number)
            existing_result = await session.execute(
                select(PartsCatalog).where(
                    PartsCatalog.supplier_id == supplier.id,
                    PartsCatalog.normalized_part_number == normalized,
                )
            )
            if existing_result.scalar_one_or_none() is not None:
                continue
            session.add(
                PartsCatalog(
                    supplier_id=supplier.id,
                    category_id=category_lookup[category_key],
                    part_name=part_name,
                    part_number=part_number,
                    normalized_part_number=normalized,
                    brand=brand,
                    unit_price=unit_price,
                    quantity_in_stock=qty,
                    min_order_quantity=min_qty,
                    lead_time_hours=lead_hours,
                )
            )

        await session.commit()
    return category_lookup


# ── 3. Orders & Items (expanded to 10 orders, varied statuses) ──────────────


async def seed_orders_and_items(category_lookup: dict[str, int]) -> list[int]:
    created_or_existing_order_ids: list[int] = []
    async with AsyncSessionLocal() as session:
        buyer_profile_result = await session.execute(select(BuyerProfile))
        buyer_profiles = buyer_profile_result.scalars().all()
        buyers_by_name = {buyer.factory_name: buyer for buyer in buyer_profiles}

        now = datetime.now(timezone.utc).replace(tzinfo=None)

        order_templates = [
            # ── Mumbai Steelworks orders ──
            (
                "Mumbai Steelworks",
                "urgent",
                "PLACED",
                now + timedelta(days=3),
                [
                    (
                        category_lookup["Bearings:Deep Groove Ball Bearings"],
                        "SKF-6205",
                        "Drive shaft bearing",
                        20,
                    ),
                    (
                        category_lookup["Fasteners:Industrial Bolts"],
                        "HTB-M12-75",
                        "Mounting bolts",
                        200,
                    ),
                ],
            ),
            (
                "Mumbai Steelworks",
                "standard",
                "PLACED",
                now + timedelta(days=7),
                [
                    (
                        category_lookup["Seals:Oil Seals"],
                        "NOK-TC-3552",
                        "Seal replacement",
                        10,
                    ),
                ],
            ),
            (
                "Mumbai Steelworks",
                "critical",
                "PLACED",
                now + timedelta(days=1),
                [
                    (
                        category_lookup["Gears:Spur Gears"],
                        "SG-M2-40T",
                        "Emergency gear replacement",
                        2,
                    ),
                    (
                        category_lookup["Hydraulics:Hydraulic Pumps"],
                        "A10VSO-45DR",
                        "Backup pump",
                        1,
                    ),
                ],
            ),
            # ── Chennai Auto Components orders ──
            (
                "Chennai Auto Components",
                "critical",
                "PLACED",
                now + timedelta(days=2),
                [
                    (
                        category_lookup["Hydraulics:Hydraulic Pumps"],
                        "A10VSO-45DR",
                        "Press line hydraulic pump",
                        2,
                    ),
                ],
            ),
            (
                "Chennai Auto Components",
                "standard",
                "PLACED",
                now + timedelta(days=10),
                [
                    (
                        category_lookup["Power Transmission:V-Belts"],
                        "VB-B72",
                        "Conveyor belt set",
                        8,
                    ),
                    (
                        category_lookup["Bearings:Deep Groove Ball Bearings"],
                        "FAG-6310",
                        "Motor bearings",
                        6,
                    ),
                ],
            ),
            (
                "Chennai Auto Components",
                "urgent",
                "PLACED",
                now + timedelta(days=4),
                [
                    (
                        category_lookup["Fasteners:Industrial Bolts"],
                        "SHCS-M8-40",
                        "Assembly screws",
                        500,
                    ),
                ],
            ),
            # ── Pune Precision Tools orders ──
            (
                "Pune Precision Tools",
                "standard",
                "PLACED",
                now + timedelta(days=8),
                [
                    (
                        category_lookup["Power Transmission:V-Belts"],
                        "VB-B72",
                        "Conveyor belt replacement",
                        12,
                    ),
                    (
                        category_lookup["Bearings:Deep Groove Ball Bearings"],
                        "NSK-6307",
                        "CNC spindle bearing",
                        8,
                    ),
                ],
            ),
            (
                "Pune Precision Tools",
                "urgent",
                "PLACED",
                now + timedelta(days=3),
                [
                    (category_lookup["Gears:Spur Gears"], "SG-M3-60T", "Lathe gear", 3),
                ],
            ),
            (
                "Pune Precision Tools",
                "standard",
                "PLACED",
                now + timedelta(days=14),
                [
                    (
                        category_lookup["Seals:Oil Seals"],
                        "SKF-HMS5-5072",
                        "Compressor seals",
                        15,
                    ),
                    (
                        category_lookup["Fasteners:Industrial Bolts"],
                        "FB-M16-100",
                        "Foundation bolts",
                        100,
                    ),
                ],
            ),
            (
                "Pune Precision Tools",
                "critical",
                "PLACED",
                now + timedelta(days=1),
                [
                    (
                        category_lookup["Hydraulics:Hydraulic Pumps"],
                        "PGP505-A",
                        "CNC hydraulic unit",
                        1,
                    ),
                ],
            ),
        ]

        for (
            factory_name,
            urgency,
            initial_status,
            delivery_date,
            items,
        ) in order_templates:
            buyer_profile = buyers_by_name.get(factory_name)
            if buyer_profile is None:
                continue

            # Check if buyer already has enough orders
            count_result = await session.execute(
                select(Order).where(Order.buyer_id == buyer_profile.id)
            )
            existing_count = len(count_result.scalars().all())
            # Allow up to 4 orders per buyer
            if existing_count >= 4:
                # Grab existing order IDs
                existing_result = await session.execute(
                    select(Order.id).where(Order.buyer_id == buyer_profile.id)
                )
                for (oid,) in existing_result.all():
                    if oid not in created_or_existing_order_ids:
                        created_or_existing_order_ids.append(oid)
                continue

            order = Order(
                buyer_id=buyer_profile.id,
                status=initial_status,
                urgency=urgency,
                required_delivery_date=delivery_date,
            )
            session.add(order)
            await session.flush()

            for category_id, part_number, part_description, quantity in items:
                session.add(
                    OrderItem(
                        order_id=order.id,
                        category_id=category_id,
                        part_number=part_number,
                        part_description=part_description,
                        quantity=quantity,
                        status="PENDING",
                    )
                )

            session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=None,
                    to_status=initial_status,
                    changed_by=buyer_profile.user_id,
                )
            )
            created_or_existing_order_ids.append(order.id)

        await session.commit()
    return created_or_existing_order_ids


# ── 4. Matching & Assignments ────────────────────────────────────────────────


async def seed_matching_and_assignments(order_ids: list[int]):
    async with AsyncSessionLocal() as session:
        for order_id in order_ids:
            # Only match PLACED orders
            order_result = await session.execute(
                select(Order).where(Order.id == order_id)
            )
            order = order_result.scalar_one_or_none()
            if order and order.status == "PLACED":
                try:
                    await match_full_order(session, order_id)
                except Exception as exc:
                    print(f"  ⚠ Matching order {order_id} failed: {exc}")


# ── 5. Deliveries & Routes ──────────────────────────────────────────────────


async def seed_deliveries_and_routes():
    async with AsyncSessionLocal() as session:
        assignment_result = await session.execute(
            select(OrderAssignment)
            .where(OrderAssignment.status.in_(["PROPOSED", "ACCEPTED"]))
            .order_by(OrderAssignment.id.asc())
        )
        assignments = assignment_result.scalars().all()

        seeded = 0
        for assignment in assignments:
            existing_delivery_result = await session.execute(
                select(Delivery)
                .join(DeliveryStop, DeliveryStop.delivery_id == Delivery.id)
                .where(DeliveryStop.order_assignment_id == assignment.id)
            )
            if existing_delivery_result.scalars().first() is not None:
                continue

            assignment.status = "ACCEPTED"
            await session.commit()
            try:
                await create_single_delivery(session, assignment.id)
                seeded += 1
            except Exception as exc:
                print(f"  ⚠ Delivery for assignment {assignment.id} failed: {exc}")
            if seeded >= 5:
                break

    # Mark some deliveries as IN_PROGRESS and COMPLETED for varied statuses
    async with AsyncSessionLocal() as session:
        delivery_result = await session.execute(
            select(Delivery).order_by(Delivery.id.asc())
        )
        deliveries = delivery_result.scalars().all()

        for i, delivery in enumerate(deliveries):
            if i == 0:
                delivery.status = "COMPLETED"
            elif i == 1:
                delivery.status = "IN_PROGRESS"
            # else stays PLANNED
        await session.commit()


# ── 6. Notifications (expanded to ~10) ──────────────────────────────────────


async def seed_sample_notifications():
    async with AsyncSessionLocal() as session:
        buyer_profiles_result = await session.execute(
            select(BuyerProfile).order_by(BuyerProfile.id.asc())
        )
        buyer_profiles = buyer_profiles_result.scalars().all()

        supplier_profiles_result = await session.execute(
            select(SupplierProfile).order_by(SupplierProfile.id.asc())
        )
        supplier_profiles = supplier_profiles_result.scalars().all()

        admin_result = await session.execute(select(User).where(User.role == "admin"))
        admin = admin_result.scalars().first()

    if not buyer_profiles or not supplier_profiles or not admin:
        return

    b1, b2, b3 = (
        buyer_profiles[0],
        buyer_profiles[1],
        buyer_profiles[2] if len(buyer_profiles) > 2 else buyer_profiles[0],
    )
    s1, s2 = (
        supplier_profiles[0],
        supplier_profiles[1] if len(supplier_profiles) > 1 else supplier_profiles[0],
    )

    notifications = [
        # Buyer notifications
        (
            "ETA_UPDATED",
            {
                "order_id": 1,
                "buyer_user_id": b1.user_id,
                "supplier_id": s1.id,
                "supplier_user_id": s1.user_id,
                "eta": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat(),
                "entity_type": "order",
                "entity_id": 1,
            },
            [b1.user_id],
        ),
        (
            "ORDER_PLACED",
            {
                "order_id": 2,
                "buyer_user_id": b2.user_id,
                "factory_name": "Chennai Auto Components",
                "parts_count": 2,
                "entity_type": "order",
                "entity_id": 2,
            },
            [b2.user_id],
        ),
        (
            "SUPPLIER_MATCHED",
            {
                "order_id": 1,
                "buyer_user_id": b1.user_id,
                "supplier_user_id": s1.user_id,
                "supplier_id": s1.id,
                "supplier_name": s1.business_name,
                "entity_type": "order",
                "entity_id": 1,
            },
            [b1.user_id],
        ),
        (
            "ORDER_CONFIRMED",
            {
                "order_id": 3,
                "buyer_user_id": b3.user_id,
                "order_item_id": 1,
                "supplier_name": s2.business_name,
                "entity_type": "order",
                "entity_id": 3,
            },
            [b3.user_id],
        ),
        (
            "DELIVERY_PLANNED",
            {
                "delivery_id": 1,
                "entity_type": "delivery",
                "entity_id": 1,
            },
            [b1.user_id],
        ),
        # Supplier notifications
        (
            "LOW_STOCK_ALERT",
            {
                "catalog_id": 1,
                "part_name": "SKF 6205 Deep Groove Bearing",
                "quantity_remaining": 4,
                "supplier_id": s1.id,
                "supplier_user_id": s1.user_id,
                "entity_type": "inventory",
                "entity_id": 1,
            },
            [s1.user_id],
        ),
        (
            "LOW_STOCK_ALERT",
            {
                "catalog_id": 8,
                "part_name": "SKF Oil Seal HMS5 50x72x8",
                "quantity_remaining": 4,
                "supplier_id": s2.id,
                "supplier_user_id": s2.user_id,
                "entity_type": "inventory",
                "entity_id": 8,
            },
            [s2.user_id],
        ),
        (
            "ORDER_DISPATCHED",
            {
                "order_id": 1,
                "buyer_user_id": b1.user_id,
                "entity_type": "order",
                "entity_id": 1,
            },
            [s1.user_id],
        ),
        # Admin notifications
        (
            "ORDER_PLACED",
            {
                "order_id": 1,
                "buyer_user_id": b1.user_id,
                "factory_name": "Mumbai Steelworks",
                "parts_count": 3,
                "entity_type": "order",
                "entity_id": 1,
            },
            [admin.id],
        ),
        (
            "DELIVERY_COMPLETED",
            {
                "delivery_id": 1,
                "entity_type": "delivery",
                "entity_id": 1,
            },
            [admin.id],
        ),
    ]

    for event_type, payload, targets in notifications:
        try:
            await emit_event(event_type, payload, targets)
        except Exception as exc:
            print(f"  ⚠ Notification {event_type} failed: {exc}")


# ── 7. Notification Templates ───────────────────────────────────────────────


async def seed_notification_templates():
    templates = [
        (
            "order_placed",
            "ORDER_PLACED",
            "New Order Placed",
            "A new order has been placed by {{factory_name}} with {{parts_count}} items.",
        ),
        (
            "supplier_matched",
            "SUPPLIER_MATCHED",
            "Supplier Matched",
            "Your order #{{order_id}} has been matched with {{supplier_name}}.",
        ),
        (
            "delivery_update",
            "ETA_UPDATED",
            "Delivery ETA Updated",
            "The estimated delivery time for order #{{order_id}} has been updated to {{eta}}.",
        ),
        (
            "low_stock_alert",
            "LOW_STOCK_ALERT",
            "Low Stock Warning",
            "{{part_name}} is running low with only {{quantity_remaining}} units remaining.",
        ),
        (
            "welcome",
            "WELCOME",
            "Welcome to SpareHub",
            "Welcome to SpareHub! Your account has been set up successfully.",
        ),
    ]

    async with AsyncSessionLocal() as session:
        for name, event_type, subject, body in templates:
            existing = await session.execute(
                select(NotificationTemplate).where(NotificationTemplate.name == name)
            )
            if existing.scalar_one_or_none() is not None:
                continue
            session.add(
                NotificationTemplate(
                    name=name,
                    event_type=event_type,
                    subject=subject,
                    body=body,
                )
            )
        await session.commit()


# ── 8. Post-seed: Advance some orders through lifecycle ─────────────────────


async def seed_order_lifecycle():
    """Move some orders through CONFIRMED/IN_TRANSIT/DELIVERED/DISPUTED statuses."""
    async with AsyncSessionLocal() as session:
        orders_result = await session.execute(select(Order).order_by(Order.id.asc()))
        orders = orders_result.scalars().all()

        if len(orders) < 6:
            return

        status_map = {
            # order index → target status
            3: "CONFIRMED",  # 4th order
            4: "IN_TRANSIT",  # 5th order
            5: "DELIVERED",  # 6th order — completed
            6: "CANCELLED",  # 7th order — cancelled
        }

        admin_result = await session.execute(select(User).where(User.role == "admin"))
        admin = admin_result.scalars().first()
        admin_id = admin.id if admin else 1

        for idx, target_status in status_map.items():
            if idx >= len(orders):
                break
            order = orders[idx]
            old_status = order.status
            order.status = target_status
            session.add(
                OrderStatusHistory(
                    order_id=order.id,
                    from_status=old_status,
                    to_status=target_status,
                    changed_by=admin_id,
                )
            )

        await session.commit()


# ── Main seed entry point ───────────────────────────────────────────────────


async def seed():
    print("🌱 Starting seed...")
    await init_db()

    print("  👤 Seeding users & profiles...")
    await seed_users_and_profiles()

    print("  📦 Seeding categories & catalog (~20 items)...")
    category_lookup = await seed_categories_and_catalog()

    print("  📋 Seeding orders & items (10 orders)...")
    order_ids = await seed_orders_and_items(category_lookup)

    print("  🔗 Running matching engine...")
    await seed_matching_and_assignments(order_ids)

    print("  🚚 Creating deliveries & routes...")
    await seed_deliveries_and_routes()

    print("  🔄 Advancing order lifecycle statuses...")
    await seed_order_lifecycle()

    print("  🔔 Seeding notifications...")
    await seed_sample_notifications()

    print("  📄 Seeding notification templates...")
    await seed_notification_templates()

    print("✅ Seed complete!")


if __name__ == "__main__":

    async def _run():
        try:
            await seed()
        finally:
            await close_db()

    asyncio.run(_run())
