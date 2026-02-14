import { useEffect, useMemo, useState } from "react";
import useSocket from "../hooks/useSocket";
import useNotificationStore from "../stores/notificationStore";
import type { SocketEventPayload } from "../types";

const statusSteps = ["PLACED", "MATCHED", "CONFIRMED", "DISPATCHED", "IN_TRANSIT", "DELIVERED"] as const;
type OrderStatus = (typeof statusSteps)[number];

const eventToStatus: Record<string, OrderStatus> = {
  ORDER_PLACED: "PLACED",
  SUPPLIER_MATCHED: "MATCHED",
  ORDER_CONFIRMED: "CONFIRMED",
  ORDER_DISPATCHED: "DISPATCHED",
  ORDER_IN_TRANSIT: "IN_TRANSIT",
  ETA_UPDATED: "IN_TRANSIT",
  ORDER_DELIVERED: "DELIVERED",
};

const parseOrderId = (metadata: Record<string, unknown> | null | undefined) => {
  if (!metadata) {
    return null;
  }
  const candidates = [metadata.order_id, metadata.entity_id];
  for (const candidate of candidates) {
    if (typeof candidate === "number" && Number.isFinite(candidate)) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.trim() !== "") {
      const parsed = Number(candidate);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
};

const formatStatus = (status: OrderStatus) => status.replace(/_/g, " ");

interface OrderStatusTrackerProps {
  orderId: number;
}

const OrderStatusTracker = ({ orderId }: OrderStatusTrackerProps) => {
  const socket = useSocket();
  const notifications = useNotificationStore((state) => state.notifications);
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>("PLACED");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(null);

  const updateIfLaterStatus = (nextStatus: OrderStatus, timestamp?: string) => {
    setCurrentStatus((previous) => {
      const prevIndex = statusSteps.indexOf(previous);
      const nextIndex = statusSteps.indexOf(nextStatus);
      if (nextIndex >= prevIndex) {
        if (timestamp) {
          setLastUpdatedAt(timestamp);
        }
        return nextStatus;
      }
      return previous;
    });
  };

  useEffect(() => {
    for (const item of notifications) {
      const itemOrderId = parseOrderId(item.metadata);
      if (itemOrderId !== orderId) {
        continue;
      }
      const mapped = eventToStatus[item.event_type];
      if (mapped) {
        updateIfLaterStatus(mapped, item.created_at);
      }
    }
  }, [notifications, orderId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onEvent = (payload: SocketEventPayload) => {
      const payloadOrderId = parseOrderId(payload.metadata ?? null);
      if (payloadOrderId !== orderId) {
        return;
      }
      const mapped = eventToStatus[payload.event_type];
      if (mapped) {
        updateIfLaterStatus(mapped, payload.timestamp);
      }
    };

    socket.on("notification", onEvent);
    socket.on("system_event", onEvent);
    return () => {
      socket.off("notification", onEvent);
      socket.off("system_event", onEvent);
    };
  }, [socket, orderId]);

  const currentStepIndex = useMemo(() => statusSteps.indexOf(currentStatus), [currentStatus]);

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Order Status Tracker</h3>
      <div className="status-tracker">
        {statusSteps.map((step, index) => {
          const state =
            index < currentStepIndex ? "done" : index === currentStepIndex ? "active" : "pending";
          return (
            <div key={step} className={`status-step ${state}`}>
              <div className="status-dot">{index + 1}</div>
              <div className="status-label">{formatStatus(step)}</div>
            </div>
          );
        })}
      </div>
      <div className="status-meta">
        Current status: <strong>{formatStatus(currentStatus)}</strong>
        {lastUpdatedAt && <span> • Updated {new Date(lastUpdatedAt).toLocaleString()}</span>}
      </div>
    </div>
  );
};

export default OrderStatusTracker;
