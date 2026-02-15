# Re-export alias — services reference models.notifications, actual classes live in events.py
from backend.models.events import EventLog, Notification, NotificationTemplate

__all__ = ["Notification", "EventLog", "NotificationTemplate"]
