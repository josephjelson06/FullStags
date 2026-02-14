from sqlalchemy import CheckConstraint, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

from backend.database import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PLACED','MATCHED','CONFIRMED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED')",
            name="ck_orders_status",
        ),
        CheckConstraint(
            "urgency IN ('standard','urgent','critical')",
            name="ck_orders_urgency",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    buyer_id = Column(Integer, ForeignKey("buyer_profiles.id"))
    status = Column(String, default="PLACED")
    urgency = Column(String, default="standard")
    required_delivery_date = Column(Text)
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))

    buyer = relationship("BuyerProfile")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")
    history = relationship("OrderStatusHistory", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PENDING','MATCHED','CONFIRMED','DISPATCHED','IN_TRANSIT','DELIVERED','CANCELLED')",
            name="ck_order_items_status",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    category_id = Column(Integer, ForeignKey("part_categories.id"))
    part_number = Column(String, nullable=False)
    part_description = Column(String)
    quantity = Column(Integer, nullable=False)
    status = Column(String, default="PENDING")

    order = relationship("Order", back_populates="items")
    category = relationship("PartCategory")
    assignments = relationship("OrderAssignment", back_populates="order_item", cascade="all, delete-orphan")
    history = relationship("OrderStatusHistory", back_populates="order_item")


class OrderAssignment(Base):
    __tablename__ = "order_assignments"
    __table_args__ = (
        CheckConstraint(
            "status IN ('PROPOSED','ACCEPTED','REJECTED','FULFILLED')",
            name="ck_order_assignments_status",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    supplier_id = Column(Integer, ForeignKey("supplier_profiles.id"))
    catalog_id = Column(Integer, ForeignKey("parts_catalog.id"))
    assigned_price = Column(Float)
    match_score = Column(Float)
    status = Column(String, default="PROPOSED")
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))

    order_item = relationship("OrderItem", back_populates="assignments")
    supplier = relationship("SupplierProfile")
    catalog = relationship("PartsCatalog")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_id = Column(Integer, ForeignKey("orders.id"))
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    from_status = Column(String)
    to_status = Column(String, nullable=False)
    changed_by = Column(Integer, ForeignKey("users.id"))
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))

    order = relationship("Order", back_populates="history")
    order_item = relationship("OrderItem", back_populates="history")
    user = relationship("User")
