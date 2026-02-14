import { FormEvent, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import type {
  EventLogItem,
  EventLogListResponse,
  EventTestContextResponse,
  EventTestEmitResponse,
} from "../../types";

const supportedEventTypes = [
  "ORDER_PLACED",
  "SUPPLIER_MATCHED",
  "ORDER_CONFIRMED",
  "ORDER_DISPATCHED",
  "ORDER_IN_TRANSIT",
  "ORDER_DELIVERED",
  "ORDER_CANCELLED",
  "LOW_STOCK_ALERT",
  "DELIVERY_PLANNED",
  "DELIVERY_COMPLETED",
  "ETA_UPDATED",
];

const parseTargetIds = (rawValue: string): number[] =>
  rawValue
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value, index, source) => Number.isFinite(value) && value > 0 && source.indexOf(value) === index);

const EventsPage = () => {
  const [events, setEvents] = useState<EventLogItem[]>([]);
  const [eventTotal, setEventTotal] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState("");
  const [entityTypeFilter, setEntityTypeFilter] = useState("");
  const [loadingEvents, setLoadingEvents] = useState(false);

  const [context, setContext] = useState<EventTestContextResponse | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emitEventType, setEmitEventType] = useState("ORDER_PLACED");
  const [emitPayload, setEmitPayload] = useState("{}");
  const [targetUserIds, setTargetUserIds] = useState("");
  const [emitResult, setEmitResult] = useState<EventTestEmitResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const templateKeys = useMemo(
    () => (context ? Object.keys(context.sample_event_templates) : []),
    [context],
  );

  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const response = await api.get<EventLogListResponse>("/events/", {
        params: {
          limit: 50,
          offset: 0,
          ...(eventTypeFilter ? { event_type: eventTypeFilter } : {}),
          ...(entityTypeFilter ? { entity_type: entityTypeFilter } : {}),
        },
      });
      setEvents(response.data.items);
      setEventTotal(response.data.total);
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadContext = async () => {
    const response = await api.get<EventTestContextResponse>("/events/test/context");
    setContext(response.data);
    if (!selectedTemplate) {
      const firstTemplate = Object.keys(response.data.sample_event_templates)[0];
      if (firstTemplate) {
        setSelectedTemplate(firstTemplate);
      }
    }
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  useEffect(() => {
    void loadContext();
  }, []);

  useEffect(() => {
    if (!context || !selectedTemplate) {
      return;
    }
    const template = context.sample_event_templates[selectedTemplate];
    if (!template) {
      return;
    }
    setEmitEventType(template.event_type);
    setEmitPayload(JSON.stringify(template.payload, null, 2));
    setTargetUserIds(template.target_user_ids.join(","));
  }, [context, selectedTemplate]);

  const emitEvent = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setEmitResult(null);

    let payload: Record<string, unknown>;
    try {
      const parsedPayload = JSON.parse(emitPayload);
      if (!parsedPayload || typeof parsedPayload !== "object" || Array.isArray(parsedPayload)) {
        setError("Payload must be a JSON object.");
        return;
      }
      payload = parsedPayload as Record<string, unknown>;
    } catch {
      setError("Payload is not valid JSON.");
      return;
    }

    if (!supportedEventTypes.includes(emitEventType)) {
      setError("Select a supported event type.");
      return;
    }

    try {
      const response = await api.post<EventTestEmitResponse>("/events/test/emit", {
        event_type: emitEventType,
        payload,
        target_user_ids: parseTargetIds(targetUserIds),
      });
      setEmitResult(response.data);
      await loadEvents();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to emit event");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form className="card" onSubmit={emitEvent} style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginTop: 0 }}>Event Test Console</h2>
        <div>
          <label>Template</label>
          <select value={selectedTemplate} onChange={(event) => setSelectedTemplate(event.target.value)}>
            <option value="">Custom</option>
            {templateKeys.map((templateName) => (
              <option key={templateName} value={templateName}>
                {templateName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Event type</label>
          <select value={emitEventType} onChange={(event) => setEmitEventType(event.target.value)}>
            {supportedEventTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Payload (JSON object)</label>
          <textarea
            rows={8}
            value={emitPayload}
            onChange={(event) => setEmitPayload(event.target.value)}
          />
        </div>
        <div>
          <label>Target user IDs (comma-separated)</label>
          <input
            value={targetUserIds}
            onChange={(event) => setTargetUserIds(event.target.value)}
            placeholder="Example: 1,2"
          />
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit">Emit Event</button>
          <button type="button" className="secondary" onClick={() => void loadEvents()}>
            Refresh Logs
          </button>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        {emitResult && (
          <div style={{ color: "var(--muted)" }}>
            Emitted {emitResult.event_type}. Notifications created: {emitResult.notifications_created}
          </div>
        )}
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>User Context</h3>
        {!context ? (
          <div>Loading context...</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>User ID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Buyer Profile</th>
                <th>Supplier Profile</th>
              </tr>
            </thead>
            <tbody>
              {context.users.map((user) => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>{user.buyer_profile_id ?? "-"}</td>
                  <td>{user.supplier_profile_id ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <h3 style={{ margin: 0 }}>Event Logs ({eventTotal})</h3>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <select value={eventTypeFilter} onChange={(event) => setEventTypeFilter(event.target.value)}>
              <option value="">All event types</option>
              {supportedEventTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
            <input
              value={entityTypeFilter}
              placeholder="Entity type filter"
              onChange={(event) => setEntityTypeFilter(event.target.value)}
            />
            <button className="secondary" onClick={() => void loadEvents()}>
              Apply
            </button>
          </div>
        </div>
        {loadingEvents ? (
          <div>Loading event logs...</div>
        ) : events.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No event logs found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Type</th>
                <th>Entity</th>
                <th>Entity ID</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {events.map((eventLog) => (
                <tr key={eventLog.id}>
                  <td>#{eventLog.id}</td>
                  <td>{eventLog.event_type}</td>
                  <td>{eventLog.entity_type ?? "-"}</td>
                  <td>{eventLog.entity_id ?? "-"}</td>
                  <td>{new Date(eventLog.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default EventsPage;
