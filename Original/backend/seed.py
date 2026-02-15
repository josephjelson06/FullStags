import asyncio
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

import backend.models  # noqa: F401
from backend.database import AsyncSessionLocal, close_db, init_db
from backend.events.bus import emit_event
from backend.middleware.auth import hash_password
from backend.models.catalog import PartCategory, PartsCatalog
from backend.models.delivery import Delivery, DeliveryStop
from backend.models.orders import Order, OrderAssignment, OrderItem, OrderStatusHistory
from backend.models.user import BuyerProfile, SupplierProfile, User
from backend.services.matching_service import match_full_order, normalize_part_number
from backend.services.routing_service import create_single_delivery


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
]


async def _ensure_user(session, *, email: str, role: str, password: str) -> User:
    result = await session.execute(select(User).where(User.email == email))
    user = result.scalar_one_or_none()
    if user is not None:
        return user

    user = User(email=email, password_hash=hash_password(password), role=role)
    session.add(user)
    await session.flush()
    return user


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

        catalog_seed = [
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


async def seed_orders_and_items(category_lookup: dict[str, int]) -> list[int]:
    created_or_existing_order_ids: list[int] = []
    async with AsyncSessionLocal() as session:
        buyer_profile_result = await session.execute(select(BuyerProfile))
        buyer_profiles = buyer_profile_result.scalars().all()
        buyers_by_name = {buyer.factory_name: buyer for buyer in buyer_profiles}

        order_templates = [
            (
                "Mumbai Steelworks",
                "urgent",
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
                "Chennai Auto Components",
                "critical",
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
                "Pune Precision Tools",
                "standard",
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
        ]

        for factory_name, urgency, items in order_templates:
            buyer_profile = buyers_by_name.get(factory_name)
            if buyer_profile is None:
                continue

            existing_order_result = await session.execute(
                select(Order)
                .where(Order.buyer_id == buyer_profile.id)
                .order_by(Order.id.desc())
            )
            existing_order = existing_order_result.scalars().first()
            if existing_order is not None:
                created_or_existing_order_ids.append(existing_order.id)
                continue

            order = Order(
                buyer_id=buyer_profile.id,
                status="PLACED",
                urgency=urgency,
                required_delivery_date=(
                    datetime.now(timezone.utc) + timedelta(days=3)
                ).replace(tzinfo=None),
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
                    to_status="PLACED",
                    changed_by=buyer_profile.user_id,
                )
            )
            created_or_existing_order_ids.append(order.id)

        await session.commit()
    return created_or_existing_order_ids


async def seed_matching_and_assignments(order_ids: list[int]):
    async with AsyncSessionLocal() as session:
        for order_id in order_ids:
            await match_full_order(session, order_id)


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
            await create_single_delivery(session, assignment.id)
            seeded += 1
            if seeded >= 3:
                break


async def seed_sample_notifications():
    async with AsyncSessionLocal() as session:
        buyer_profile_result = await session.execute(
            select(BuyerProfile).order_by(BuyerProfile.id.asc())
        )
        buyer_profile = buyer_profile_result.scalars().first()
        supplier_profile_result = await session.execute(
            select(SupplierProfile).order_by(SupplierProfile.id.asc())
        )
        supplier_profile = supplier_profile_result.scalars().first()
        if buyer_profile is None or supplier_profile is None:
            return

    await emit_event(
        "ETA_UPDATED",
        {
            "order_id": 1,
            "buyer_user_id": buyer_profile.user_id,
            "supplier_id": supplier_profile.id,
            "supplier_user_id": supplier_profile.user_id,
            "eta": (datetime.now(timezone.utc) + timedelta(hours=6)).isoformat(),
            "entity_type": "order",
            "entity_id": 1,
        },
        [buyer_profile.user_id],
    )

    await emit_event(
        "LOW_STOCK_ALERT",
        {
            "catalog_id": 1,
            "part_name": "SKF 6205 Deep Groove Bearing",
            "quantity_remaining": 4,
            "supplier_id": supplier_profile.id,
            "supplier_user_id": supplier_profile.user_id,
            "entity_type": "inventory",
            "entity_id": 1,
        },
        [supplier_profile.user_id],
    )


async def seed():
    await init_db()
    await seed_users_and_profiles()
    category_lookup = await seed_categories_and_catalog()
    order_ids = await seed_orders_and_items(category_lookup)
    await seed_matching_and_assignments(order_ids)
    await seed_deliveries_and_routes()
    await seed_sample_notifications()


if __name__ == "__main__":

    async def _run():
        try:
            await seed()
        finally:
            await close_db()

    asyncio.run(_run())
