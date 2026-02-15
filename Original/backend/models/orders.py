from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, autoincrement=True)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"))
    status = Column(String, server_default="PLACED")
    urgency = Column(String, server_default="standard")
    required_delivery_date = Column(DateTime)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    items = relationship("OrderItem", back_populates="order")
    status_history = relationship("OrderStatusHistory", back_populates="order")

    __table_args__ = (
        CheckConstraint("status IN ('PLACED','MATCHED','CONFIRMED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED')", name="ck_orders_status"),
        CheckConstraint("urgency IN ('standard','urgent','critical')", name="ck_orders_urgency"),
    )


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    category_id = Column(Integer, ForeignKey("part_categories.id"))
    part_number = Column(String, nullable=False)
    part_description = Column(String)
    quantity = Column(Integer, nullable=False)
    status = Column(String, server_default="PENDING")

    order = relationship("Order", back_populates="items")
    assignments = relationship("OrderAssignment", back_populates="order_item")
    status_history = relationship("OrderStatusHistory", back_populates="order_item")

    __table_args__ = (
        CheckConstraint("status IN ('PENDING','MATCHED','CONFIRMED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED')", name="ck_order_items_status"),
    )


class OrderAssignment(Base):
    __tablename__ = "order_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    supplier_id = Column(Integer, ForeignKey("supplier_profiles.id"))
    catalog_id = Column(Integer, ForeignKey("parts_catalog.id"))
    assigned_price = Column(Float)
    match_score = Column(Float)
    status = Column(String, server_default="PROPOSED")
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    order_item = relationship("OrderItem", back_populates="assignments")

    __table_args__ = (
        CheckConstraint("status IN ('PROPOSED','ACCEPTED','REJECTED','FULFILLED')", name="ck_order_assignments_status"),
    )


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    from_status = Column(String)
    to_status = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    order = relationship("Order", back_populates="status_history")
    order_item = relationship("OrderItem", back_populates="status_history")
