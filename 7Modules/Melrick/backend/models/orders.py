from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from ..database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"))
    status = Column(String, default="PLACED")
    urgency = Column(String, default="standard")
    required_delivery_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    category_id = Column(Integer, ForeignKey("part_categories.id"))
    part_number = Column(String, nullable=False)
    part_description = Column(String)
    quantity = Column(Integer, nullable=False)
    status = Column(String, default="PENDING")


class OrderAssignment(Base):
    __tablename__ = "order_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    supplier_id = Column(Integer, ForeignKey("supplier_profiles.id"))
    catalog_id = Column(Integer, ForeignKey("parts_catalog.id"))
    assigned_price = Column(Float)
    match_score = Column(Float)
    status = Column(String, default="PROPOSED")
    created_at = Column(DateTime, server_default=func.now())


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"), nullable=True)
    from_status = Column(String)
    to_status = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.now())
