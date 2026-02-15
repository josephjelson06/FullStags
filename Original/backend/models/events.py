from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.sql import func

from backend.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    event_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    message = Column(String, nullable=False)
    is_read = Column(Boolean, server_default="0", nullable=False)
    metadata_json = Column("metadata", String)
    created_at = Column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )


class EventLog(Base):
    __tablename__ = "event_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    event_type = Column(String, nullable=False)
    entity_type = Column(String)
    entity_id = Column(Integer)
    payload = Column(String)
    created_at = Column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )


class NotificationTemplate(Base):
    __tablename__ = "notification_templates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String, nullable=False, unique=True)
    event_type = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body = Column(String, nullable=False)
    is_active = Column(Boolean, server_default="1", nullable=False)
    created_at = Column(
        DateTime, server_default=func.current_timestamp(), nullable=False
    )
