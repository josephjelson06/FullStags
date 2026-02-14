import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import useSocket from "../hooks/useSocket";
import type { EventLogListResponse, SocketEventPayload } from "../types";

interface ActivityItem {
  id: string;
  eventType: string;
  title: string;
  message: string;
  timestamp: string;
}

const badgeClassForType = (eventType: string) => {
  if (eventType.includes("CANCELLED")) return "event-badge danger";
  if (eventType.includes("DELIVERED") || eventType.includes("COMPLETED")) return "event-badge success";
  if (eventType.includes("LOW_STOCK") || eventType.includes("ETA")) return "event-badge warning";
  return "event-badge";
};

const formatTimestamp = (value: string) =>
  new Date(value).toLocaleString([], {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "short",
  });

const LiveActivityFeed = () => {
  const socket = useSocket();
  const [events, setEvents] = useState<ActivityItem[]>([]);

  useEffect(() => {
    const loadInitial = async () => {
      try {
        const response = await api.get<EventLogListResponse>("/events/", {
          params: { limit: 25, offset: 0 },
        });
        const mapped = response.data.items.map((item) => ({
          id: `history-${item.id}`,
          eventType: item.event_type,
          title: item.event_type.replace(/_/g, " "),
          message: item.payload?.message ? String(item.payload.message) : "System event recorded",
          timestamp: item.created_at,
        }));
        setEvents(mapped);
      } catch {
        setEvents([]);
      }
    };

    void loadInitial();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onSystemEvent = (payload: SocketEventPayload) => {
      const item: ActivityItem = {
        id: `live-${payload.timestamp}-${Math.random()}`,
        eventType: payload.event_type,
        title: payload.title,
        message: payload.message,
        timestamp: payload.timestamp,
      };
      setEvents((prev) => [item, ...prev].slice(0, 40));
    };

    socket.on("system_event", onSystemEvent);
    return () => {
      socket.off("system_event", onSystemEvent);
    };
  }, [socket]);

  const renderedEvents = useMemo(() => events.slice(0, 20), [events]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Live Activity Feed</h3>
      <div className="live-feed">
        {renderedEvents.length === 0 && (
          <div className="notification-empty">No activity yet.</div>
        )}
        {renderedEvents.map((item) => (
          <div key={item.id} className="live-item">
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.4rem" }}>
              <span className={badgeClassForType(item.eventType)}>{item.eventType}</span>
              <span className="live-time">{formatTimestamp(item.timestamp)}</span>
            </div>
            <div className="live-title">{item.title}</div>
            <div className="live-message">{item.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LiveActivityFeed;
