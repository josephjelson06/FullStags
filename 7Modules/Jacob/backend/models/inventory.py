from sqlalchemy import CheckConstraint, Column, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import text

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
    min_order_quantity = Column(Integer, default=1)
    lead_time_hours = Column(Integer, nullable=False)
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))
    updated_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))

    supplier = relationship("SupplierProfile", back_populates="catalog_entries")
    category = relationship("PartCategory", back_populates="parts")
    transactions = relationship("InventoryTransaction", back_populates="catalog_entry")


class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    __table_args__ = (
        CheckConstraint(
            "reason IN ('restock','order_confirmed','manual_adjustment','csv_upload')",
            name="ck_inventory_transactions_reason",
        ),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    catalog_id = Column(Integer, ForeignKey("parts_catalog.id"))
    change_amount = Column(Integer, nullable=False)
    reason = Column(String)
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))

    catalog_entry = relationship("PartsCatalog", back_populates="transactions")
