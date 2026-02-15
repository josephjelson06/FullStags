from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from backend.database import Base


class PartCategory(Base):
    __tablename__ = "part_categories"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False)
    subcategory = Column(String)

    parts = relationship("PartsCatalog", back_populates="category")


class PartsCatalog(Base):
    __tablename__ = "parts_catalog"

    id = Column(Integer, primary_key=True, autoincrement=True)
    supplier_id = Column(Integer, ForeignKey("supplier_profiles.id"))
    category_id = Column(Integer, ForeignKey("part_categories.id"))
    part_name = Column(String, nullable=False)
    part_number = Column(String, nullable=False)
    normalized_part_number = Column(String, nullable=False)
    brand = Column(String)
    unit_price = Column(Float, nullable=False)
    quantity_in_stock = Column(Integer, nullable=False)
    min_order_quantity = Column(Integer, server_default="1")
    lead_time_hours = Column(Integer, nullable=False)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)
    updated_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    supplier = relationship("SupplierProfile", back_populates="catalog_items")
    category = relationship("PartCategory", back_populates="parts")
    inventory_transactions = relationship("InventoryTransaction", back_populates="catalog")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    catalog_id = Column(Integer, ForeignKey("parts_catalog.id"))
    change_amount = Column(Integer, nullable=False)
    reason = Column(String)
    created_at = Column(DateTime, server_default=func.current_timestamp(), nullable=False)

    catalog = relationship("PartsCatalog", back_populates="inventory_transactions")

    __table_args__ = (
        CheckConstraint("reason IN ('restock','order_confirmed','manual_adjustment','csv_upload')", name="ck_inventory_transactions_reason"),
    )
