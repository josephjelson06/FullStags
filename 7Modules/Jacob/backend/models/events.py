from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.sql import text

from backend.database import Base


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False)
    entity_type = Column(String)
    entity_id = Column(Integer)
    payload = Column(Text)
    created_at = Column(Text, server_default=text("CURRENT_TIMESTAMP"))
