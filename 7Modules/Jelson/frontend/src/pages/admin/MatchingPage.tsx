import { FormEvent, useEffect, useState } from "react";
import api from "../../api/client";
import type { MatchingLog, MatchRunResponse } from "../../types";

const MatchingPage = () => {
  const [orderId, setOrderId] = useState("");
  const [orderItemIdFilter, setOrderItemIdFilter] = useState("");
  const [logs, setLogs] = useState<MatchingLog[]>([]);
  const [runResult, setRunResult] = useState<MatchRunResponse | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const filterValue = Number(orderItemIdFilter);
      const response = await api.get<MatchingLog[]>("/matching/logs", {
        params:
          Number.isFinite(filterValue) && filterValue > 0
            ? { order_item_id: filterValue }
            : {},
      });
      setLogs(response.data);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  const runMatching = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setRunResult(null);
    const parsedOrderId = Number(orderId);
    if (!Number.isFinite(parsedOrderId) || parsedOrderId <= 0) {
      setError("Enter a valid order ID.");
      return;
    }

    setRunning(true);
    try {
      const response = await api.post<MatchRunResponse>("/matching/run", {
        order_id: parsedOrderId,
      });
      setRunResult(response.data);
      await loadLogs();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to run matching");
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form className="card" onSubmit={runMatching} style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginTop: 0 }}>Matching Control</h2>
        <div>
          <label>Order ID</label>
          <input
            type="number"
            min={1}
            value={orderId}
            onChange={(event) => setOrderId(event.target.value)}
            required
          />
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit" disabled={running}>
            {running ? "Running..." : "Run Matching"}
          </button>
          <button type="button" className="secondary" onClick={() => void loadLogs()}>
            Refresh Logs
          </button>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        {runResult && (
          <div style={{ color: "var(--muted)" }}>
            Order #{runResult.order_id}: matched {runResult.matched_items} items, created{" "}
            {runResult.assignments_created} assignments, wrote {runResult.logs_written} logs.
          </div>
        )}
      </form>

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <h3 style={{ margin: 0 }}>Matching Logs</h3>
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <input
              type="number"
              min={1}
              placeholder="Filter by order_item_id"
              value={orderItemIdFilter}
              onChange={(event) => setOrderItemIdFilter(event.target.value)}
            />
            <button className="secondary" onClick={() => void loadLogs()}>
              Apply
            </button>
          </div>
        </div>
        {loadingLogs ? (
          <div>Loading logs...</div>
        ) : logs.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No matching logs found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Log</th>
                <th>Order Item</th>
                <th>Supplier</th>
                <th>Score</th>
                <th>Rank</th>
                <th>Distance (km)</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>#{log.id}</td>
                  <td>{log.order_item_id ?? "-"}</td>
                  <td>{log.supplier_id ?? "-"}</td>
                  <td>{log.total_score?.toFixed(4) ?? "-"}</td>
                  <td>{log.rank ?? "-"}</td>
                  <td>{log.distance_km?.toFixed(2) ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default MatchingPage;
