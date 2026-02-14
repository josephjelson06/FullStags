import asyncio
import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from backend.database import AsyncSessionLocal, Base, engine
from backend.models.inventory import PartCategory, PartsCatalog
from backend.models.notifications import Notification
from backend.models.orders import Order, OrderAssignment, OrderItem
from backend.models.users import BuyerProfile, SupplierProfile, User
from backend.services.matching_service import match_full_order, normalize_part_number
from backend.services.routing_service import create_batched_delivery, create_single_delivery


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        existing = await session.execute(select(User).limit(1))
        if existing.scalar_one_or_none():
            print("Seed data already exists.")
            return

        users_data = [
            ("admin@platform.com", "admin"),
            ("buyer1@factory.com", "buyer"),
            ("buyer2@factory.com", "buyer"),
            ("buyer3@factory.com", "buyer"),
            ("supplier1@vendor.com", "supplier"),
            ("supplier2@vendor.com", "supplier"),
            ("supplier3@vendor.com", "supplier"),
            ("supplier4@vendor.com", "supplier"),
            ("supplier5@vendor.com", "supplier"),
        ]
        users = [User(email=email, password_hash="demo", role=role) for email, role in users_data]
        session.add_all(users)
        await session.flush()
        users_by_email = {user.email: user for user in users}

        buyers_data = [
            {
                "email": "buyer1@factory.com",
                "factory_name": "IndusSteel Works",
                "industry_type": "Automotive Components",
                "delivery_address": "Taloja MIDC, Navi Mumbai",
                "latitude": 19.0330,
                "longitude": 73.0297,
            },
            {
                "email": "buyer2@factory.com",
                "factory_name": "Shiv Engineering Pvt Ltd",
                "industry_type": "Food Processing Machinery",
                "delivery_address": "Rabale MIDC, Navi Mumbai",
                "latitude": 19.1176,
                "longitude": 72.9986,
            },
            {
                "email": "buyer3@factory.com",
                "factory_name": "WestLine Motion Tech",
                "industry_type": "Packaging Lines",
                "delivery_address": "Bhiwandi Industrial Area",
                "latitude": 19.3002,
                "longitude": 73.0635,
            },
        ]
        buyer_profiles = []
        for buyer_data in buyers_data:
            profile = BuyerProfile(
                user_id=users_by_email[buyer_data["email"]].id,
                factory_name=buyer_data["factory_name"],
                industry_type=buyer_data["industry_type"],
                delivery_address=buyer_data["delivery_address"],
                latitude=buyer_data["latitude"],
                longitude=buyer_data["longitude"],
            )
            session.add(profile)
            buyer_profiles.append(profile)
        await session.flush()
        buyers_by_name = {profile.factory_name: profile for profile in buyer_profiles}

        suppliers_data = [
            {
                "email": "supplier1@vendor.com",
                "business_name": "Mumbai Industrial Supply Co.",
                "warehouse_address": "Andheri East, Mumbai",
                "gst_number": "27AAACM0001Z1",
                "service_radius_km": 220,
                "latitude": 19.0760,
                "longitude": 72.8777,
                "reliability_score": 0.82,
            },
            {
                "email": "supplier2@vendor.com",
                "business_name": "Pune Precision Spares",
                "warehouse_address": "Chakan MIDC, Pune",
                "gst_number": "27AAACP0002Z2",
                "service_radius_km": 200,
                "latitude": 18.5204,
                "longitude": 73.8567,
                "reliability_score": 0.78,
            },
            {
                "email": "supplier3@vendor.com",
                "business_name": "Ahmedabad Bearings Ltd.",
                "warehouse_address": "Sanand GIDC, Ahmedabad",
                "gst_number": "24AAACA0003Z3",
                "service_radius_km": 240,
                "latitude": 23.0225,
                "longitude": 72.5714,
                "reliability_score": 0.74,
            },
            {
                "email": "supplier4@vendor.com",
                "business_name": "Chennai Mechatronics",
                "warehouse_address": "Ambattur Industrial Estate, Chennai",
                "gst_number": "33AAACC0004Z4",
                "service_radius_km": 260,
                "latitude": 13.0827,
                "longitude": 80.2707,
                "reliability_score": 0.81,
            },
            {
                "email": "supplier5@vendor.com",
                "business_name": "Bengaluru Motion Systems",
                "warehouse_address": "Peenya Industrial Area, Bengaluru",
                "gst_number": "29AAACB0005Z5",
                "service_radius_km": 210,
                "latitude": 12.9716,
                "longitude": 77.5946,
                "reliability_score": 0.76,
            },
        ]
        supplier_profiles = []
        for supplier_data in suppliers_data:
            supplier = SupplierProfile(
                user_id=users_by_email[supplier_data["email"]].id,
                business_name=supplier_data["business_name"],
                warehouse_address=supplier_data["warehouse_address"],
                gst_number=supplier_data["gst_number"],
                service_radius_km=supplier_data["service_radius_km"],
                latitude=supplier_data["latitude"],
                longitude=supplier_data["longitude"],
                reliability_score=supplier_data["reliability_score"],
            )
            session.add(supplier)
            supplier_profiles.append(supplier)
        await session.flush()
        suppliers_by_name = {profile.business_name: profile for profile in supplier_profiles}

        categories_data = [
            ("Bearings", "Deep Groove"),
            ("Motors", "AC Induction"),
            ("Electrical", "Power Electronics"),
            ("Hydraulics", "Valves"),
            ("Belts", "V-Belt"),
            ("Filters", "Fuel"),
        ]
        categories = [PartCategory(name=name, subcategory=subcategory) for name, subcategory in categories_data]
        session.add_all(categories)
        await session.flush()
        categories_by_name = {category.name: category for category in categories}

        catalog_data = [
            ("Mumbai Industrial Supply Co.", "Bearings", "Deep Groove Ball Bearing", "6205-2RS", "SKF", 245.0, 120, 24),
            ("Mumbai Industrial Supply Co.", "Electrical", "MOSFET Power Transistor", "IRF540N", "IR", 38.0, 400, 18),
            ("Mumbai Industrial Supply Co.", "Belts", "V-Belt", "GATES-A42", "Gates", 155.0, 90, 20),
            ("Mumbai Industrial Supply Co.", "Hydraulics", "Hydraulic Hose", "PARKER-2H395", "Parker", 980.0, 45, 36),
            ("Pune Precision Spares", "Bearings", "Deep Groove Ball Bearing", "6205-2RS", "NSK", 230.0, 80, 30),
            ("Pune Precision Spares", "Electrical", "DC-DC Buck Converter", "LM2596S", "TI", 52.0, 300, 26),
            ("Pune Precision Spares", "Filters", "Fuel Filter", "BOSCH-0451103316", "Bosch", 620.0, 70, 28),
            ("Pune Precision Spares", "Hydraulics", "Solenoid Valve", "FESTO-CPV14", "Festo", 860.0, 40, 48),
            ("Ahmedabad Bearings Ltd.", "Bearings", "Deep Groove Ball Bearing", "SKF-6203", "SKF", 180.0, 140, 22),
            ("Ahmedabad Bearings Ltd.", "Electrical", "MOSFET Power Transistor", "IRF540N", "Infineon", 36.0, 260, 24),
            ("Ahmedabad Bearings Ltd.", "Belts", "V-Belt", "GATES-A42", "Gates", 150.0, 110, 26),
            ("Ahmedabad Bearings Ltd.", "Motors", "AC Induction Motor", "ABB-ACM2-090L", "ABB", 18500.0, 12, 72),
            ("Chennai Mechatronics", "Bearings", "Deep Groove Ball Bearing", "6204-ZZ", "SKF", 210.0, 100, 24),
            ("Chennai Mechatronics", "Electrical", "DC-DC Buck Converter", "LM2596S", "TI", 55.0, 210, 30),
            ("Chennai Mechatronics", "Motors", "AC Induction Motor", "SIEMENS-1LE1002", "Siemens", 19200.0, 8, 96),
            ("Chennai Mechatronics", "Hydraulics", "Hydraulic Hose", "PARKER-2H395", "Parker", 1010.0, 30, 40),
            ("Bengaluru Motion Systems", "Bearings", "Deep Groove Ball Bearing", "6205-2RS", "FAG", 250.0, 95, 32),
            ("Bengaluru Motion Systems", "Bearings", "Deep Groove Ball Bearing", "SKF-6203", "SKF", 175.0, 130, 26),
            ("Bengaluru Motion Systems", "Filters", "Fuel Filter", "BOSCH-0451103316", "Bosch", 610.0, 65, 34),
            ("Bengaluru Motion Systems", "Hydraulics", "Solenoid Valve", "FESTO-CPV14", "Festo", 845.0, 55, 42),
        ]

        catalog_entries = []
        for supplier_name, category_name, part_name, part_number, brand, unit_price, stock, lead_hours in catalog_data:
            entry = PartsCatalog(
                supplier_id=suppliers_by_name[supplier_name].id,
                category_id=categories_by_name[category_name].id,
                part_name=part_name,
                part_number=part_number,
                normalized_part_number=normalize_part_number(part_number),
                brand=brand,
                unit_price=unit_price,
                quantity_in_stock=stock,
                lead_time_hours=lead_hours,
            )
            session.add(entry)
            catalog_entries.append(entry)
        await session.flush()

        now = datetime.now(timezone.utc)

        orders_data = [
            # Module 2 placed orders
            (buyers_by_name["IndusSteel Works"].id, "PLACED", "standard", now + timedelta(hours=72)),
            (buyers_by_name["IndusSteel Works"].id, "PLACED", "urgent", now + timedelta(hours=24)),
            (buyers_by_name["IndusSteel Works"].id, "PLACED", "critical", now + timedelta(hours=12)),
            # Module 3 confirmed orders
            (buyers_by_name["Shiv Engineering Pvt Ltd"].id, "CONFIRMED", "urgent", now + timedelta(hours=30)),
            (buyers_by_name["WestLine Motion Tech"].id, "CONFIRMED", "standard", now + timedelta(hours=36)),
            (buyers_by_name["Shiv Engineering Pvt Ltd"].id, "CONFIRMED", "standard", now + timedelta(hours=40)),
            (buyers_by_name["WestLine Motion Tech"].id, "CONFIRMED", "standard", now + timedelta(hours=42)),
            (buyers_by_name["Shiv Engineering Pvt Ltd"].id, "CONFIRMED", "standard", now + timedelta(hours=48)),
        ]
        orders = [
            Order(
                buyer_id=buyer_id,
                status=status,
                urgency=urgency,
                required_delivery_date=required_delivery,
            )
            for buyer_id, status, urgency, required_delivery in orders_data
        ]
        session.add_all(orders)
        await session.flush()

        order_items_data = [
            (orders[0].id, "Bearings", "6205-2RS", "Bearing for conveyor rollers", 10, "PENDING"),
            (orders[0].id, "Electrical", "IRF540N", "MOSFET for drive controller", 20, "PENDING"),
            (orders[1].id, "Belts", "GATES-A42", "Replacement V-belt", 5, "PENDING"),
            (orders[1].id, "Electrical", "LM2596S", "DC-DC converter for PLC", 10, "PENDING"),
            (orders[2].id, "Filters", "BOSCH-0451103316", "Fuel filter", 4, "PENDING"),
            (orders[2].id, "Hydraulics", "FESTO-CPV14", "Solenoid valve", 2, "PENDING"),
            (orders[2].id, "Bearings", "6204-ZZ", "Bearing for motor shaft", 8, "PENDING"),
            (orders[3].id, "Bearings", "6205-2RS", "Confirmed critical bearing", 6, "CONFIRMED"),
            (orders[4].id, "Electrical", "IRF540N", "Confirmed power transistor", 25, "CONFIRMED"),
            (orders[5].id, "Belts", "GATES-A42", "Batch lane belt order", 8, "CONFIRMED"),
            (orders[6].id, "Belts", "GATES-A42", "Batch lane belt order 2", 7, "CONFIRMED"),
            (orders[7].id, "Electrical", "LM2596S", "Available confirmed assignment for dashboard", 12, "CONFIRMED"),
        ]
        order_items = []
        for order_id, category_name, part_number, description, quantity, status in order_items_data:
            item = OrderItem(
                order_id=order_id,
                category_id=categories_by_name[category_name].id,
                part_number=part_number,
                part_description=description,
                quantity=quantity,
                status=status,
            )
            session.add(item)
            order_items.append(item)
        await session.flush()

        catalog_lookup = {(entry.supplier_id, entry.part_number): entry for entry in catalog_entries}
        supplier_mumbai_id = suppliers_by_name["Mumbai Industrial Supply Co."].id
        supplier_pune_id = suppliers_by_name["Pune Precision Spares"].id

        confirmed_assignments = [
            OrderAssignment(
                order_item_id=order_items[7].id,
                supplier_id=supplier_mumbai_id,
                catalog_id=catalog_lookup[(supplier_mumbai_id, "6205-2RS")].id,
                assigned_price=catalog_lookup[(supplier_mumbai_id, "6205-2RS")].unit_price,
                match_score=0.91,
                status="ACCEPTED",
            ),
            OrderAssignment(
                order_item_id=order_items[8].id,
                supplier_id=supplier_mumbai_id,
                catalog_id=catalog_lookup[(supplier_mumbai_id, "IRF540N")].id,
                assigned_price=catalog_lookup[(supplier_mumbai_id, "IRF540N")].unit_price,
                match_score=0.88,
                status="ACCEPTED",
            ),
            OrderAssignment(
                order_item_id=order_items[9].id,
                supplier_id=supplier_mumbai_id,
                catalog_id=catalog_lookup[(supplier_mumbai_id, "GATES-A42")].id,
                assigned_price=catalog_lookup[(supplier_mumbai_id, "GATES-A42")].unit_price,
                match_score=0.87,
                status="ACCEPTED",
            ),
            OrderAssignment(
                order_item_id=order_items[10].id,
                supplier_id=supplier_mumbai_id,
                catalog_id=catalog_lookup[(supplier_mumbai_id, "GATES-A42")].id,
                assigned_price=catalog_lookup[(supplier_mumbai_id, "GATES-A42")].unit_price,
                match_score=0.85,
                status="ACCEPTED",
            ),
            OrderAssignment(
                order_item_id=order_items[11].id,
                supplier_id=supplier_pune_id,
                catalog_id=catalog_lookup[(supplier_pune_id, "LM2596S")].id,
                assigned_price=catalog_lookup[(supplier_pune_id, "LM2596S")].unit_price,
                match_score=0.84,
                status="ACCEPTED",
            ),
        ]
        session.add_all(confirmed_assignments)
        await session.commit()

        # Module 2 seeded matching output for one newly placed order.
        await match_full_order(
            session=session,
            order_id=orders[0].id,
            simulate=False,
            changed_by_user_id=users_by_email["admin@platform.com"].id,
        )

        # Module 3 seeded deliveries:
        # 1) two single deliveries
        await create_single_delivery(session, confirmed_assignments[0].id, created_by_user_id=0)
        await create_single_delivery(session, confirmed_assignments[1].id, created_by_user_id=0)
        # 2) one batched delivery across nearby buyers
        await create_batched_delivery(
            session,
            [confirmed_assignments[2].id, confirmed_assignments[3].id],
            num_vehicles=2,
            created_by_user_id=0,
        )

        # Module 6 sample notifications for merged UI smoke testing.
        sample_notifications = [
            Notification(
                user_id=users_by_email["buyer1@factory.com"].id,
                event_type="ORDER_PLACED",
                title="Order Submitted",
                message=f"Order #{orders[1].id} is queued for supplier matching.",
                metadata_json=json.dumps({"order_id": orders[1].id, "urgency": orders[1].urgency}),
            ),
            Notification(
                user_id=users_by_email["supplier1@vendor.com"].id,
                event_type="SUPPLIER_MATCHED",
                title="New Match Opportunity",
                message=f"You were matched on order #{orders[0].id}.",
                metadata_json=json.dumps({"order_id": orders[0].id}),
            ),
            Notification(
                user_id=users_by_email["buyer2@factory.com"].id,
                event_type="DELIVERY_PLANNED",
                title="Delivery Planned",
                message="Your confirmed order has a delivery route assigned.",
                metadata_json=json.dumps({"order_id": orders[3].id}),
            ),
            Notification(
                user_id=users_by_email["supplier2@vendor.com"].id,
                event_type="LOW_STOCK_ALERT",
                title="Low Stock Alert",
                message="LM2596S inventory dropped near reorder threshold.",
                metadata_json=json.dumps({"part_number": "LM2596S", "threshold": 20}),
            ),
        ]
        session.add_all(sample_notifications)
        await session.commit()

        print("Seed data inserted with integrated matching, deliveries, and notifications.")


if __name__ == "__main__":
    asyncio.run(seed())
