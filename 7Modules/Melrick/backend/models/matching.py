from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from ..database import Base


class MatchingLog(Base):
    __tablename__ = "matching_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    order_item_id = Column(Integer, ForeignKey("order_items.id"))
    supplier_id = Column(Integer, ForeignKey("supplier_profiles.id"))
    distance_km = Column(Float)
    distance_score = Column(Float)
    reliability_score = Column(Float)
    price_score = Column(Float)
    urgency_score = Column(Float)
    total_score = Column(Float)
    rank = Column(Integer)
    created_at = Column(DateTime, server_default=func.now())
