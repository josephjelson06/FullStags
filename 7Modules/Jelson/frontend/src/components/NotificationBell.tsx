import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useNotifications from "../hooks/useNotifications";
import useAuthStore from "../stores/authStore";
import type { NotificationItem, Role } from "../types";

const eventLabel = (eventType: string) => {
  if (eventType.includes("ORDER")) return "ORD";
  if (eventType.includes("DELIVERY")) return "DLV";
  if (eventType.includes("STOCK")) return "INV";
  if (eventType.includes("ETA")) return "ETA";
  return "EVT";
};

const parseOrderId = (notification: NotificationItem) => {
  const metadata = notification.metadata ?? {};
  const orderId = metadata.order_id ?? metadata.entity_id;
  if (typeof orderId === "number") return orderId;
  if (typeof orderId === "string" && orderId.trim() !== "") {
    const parsed = Number(orderId);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const defaultPathForRole = (role: Role) => {
  if (role === "buyer") return "/buyer/orders";
  if (role === "supplier") return "/supplier/assigned";
  return "/admin/orders";
};

const resolveNotificationPath = (notification: NotificationItem, role: Role) => {
  const orderId = parseOrderId(notification);
  if (orderId !== null) return `/orders/${orderId}`;

  if (notification.event_type === "LOW_STOCK_ALERT") {
    return role === "supplier" ? "/supplier/inventory" : "/admin/orders";
  }

  if (notification.event_type.startsWith("DELIVERY")) {
    return role === "admin" ? "/admin" : "/supplier/assigned";
  }

  return defaultPathForRole(role);
};

const relativeTime = (isoDate: string) => {
  const date = new Date(isoDate);
  const diffMs = date.getTime() - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  if (Math.abs(diffMinutes) < 60) return formatter.format(diffMinutes, "minute");
  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) return formatter.format(diffHours, "hour");
  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, "day");
};

const NotificationBell = () => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllRead } = useNotifications();
  const role = useAuthStore((state) => state.user?.role ?? "buyer");
  const recentNotifications = useMemo(() => notifications.slice(0, 12), [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNotificationClick = async (notification: NotificationItem) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    navigate(resolveNotificationPath(notification, role));
    setOpen(false);
  };

  return (
    <div className="notification-shell" ref={containerRef}>
      <button
        type="button"
        className="notification-trigger secondary"
        onClick={() => setOpen((current) => !current)}
      >
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M12 3a6 6 0 0 0-6 6v3.3l-1.6 2.9A1 1 0 0 0 5.3 17h13.4a1 1 0 0 0 .9-1.5L18 12.3V9a6 6 0 0 0-6-6m0 19a3 3 0 0 0 2.8-2H9.2A3 3 0 0 0 12 22"
            fill="currentColor"
          />
        </svg>
        <span>Notifications</span>
        {unreadCount > 0 && <span className="notification-count">{unreadCount}</span>}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <strong>Notifications</strong>
            <button type="button" className="secondary" onClick={() => void markAllRead()}>
              Mark all read
            </button>
          </div>
          <div className="notification-list">
            {recentNotifications.length === 0 && (
              <div className="notification-empty">No notifications yet.</div>
            )}
            {recentNotifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className={`notification-item ${notification.is_read ? "read" : "unread"}`}
                onClick={() => void handleNotificationClick(notification)}
              >
                <span className="notification-icon">{eventLabel(notification.event_type)}</span>
                <span className="notification-copy">
                  <span className="notification-title">{notification.title}</span>
                  <span className="notification-message">{notification.message}</span>
                  <span className="notification-time">{relativeTime(notification.created_at)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
