import { FormEvent, useEffect, useState } from "react";
import api from "../../api/client";
import type { Delivery } from "../../types";

const deliveryStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

const AdminDeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [assignmentIdsInput, setAssignmentIdsInput] = useState("");
  const [batchResult, setBatchResult] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDeliveries = async () => {
    setLoading(true);
    try {
      const response = await api.get<Delivery[]>("/deliveries/");
      setDeliveries(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDeliveries();
  }, []);

  const updateDeliveryStatus = async (deliveryId: number, status: string) => {
    await api.patch(`/deliveries/${deliveryId}/status`, { status });
    await loadDeliveries();
  };

  const runBatchOptimization = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBatchResult(null);

    const ids = assignmentIdsInput
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value, index, source) => Number.isFinite(value) && value > 0 && source.indexOf(value) === index);

    if (ids.length === 0) {
      setError("Enter one or more assignment IDs (comma-separated).");
      return;
    }

    try {
      const response = await api.post<Delivery>("/deliveries/batch/optimize", {
        assignment_ids: ids,
      });
      setBatchResult(response.data);
      await loadDeliveries();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to optimize batch delivery");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form className="card" onSubmit={runBatchOptimization} style={{ display: "grid", gap: "0.75rem" }}>
        <h2 style={{ marginTop: 0 }}>Batch Routing</h2>
        <div>
          <label>Assignment IDs (comma-separated)</label>
          <input
            value={assignmentIdsInput}
            onChange={(event) => setAssignmentIdsInput(event.target.value)}
            placeholder="Example: 11, 12, 18"
          />
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit">Optimize Batch</button>
          <button type="button" className="secondary" onClick={() => void loadDeliveries()}>
            Refresh Deliveries
          </button>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
        {batchResult && (
          <div style={{ color: "var(--muted)" }}>
            Created delivery #{batchResult.id} ({batchResult.delivery_type}) with status {batchResult.status}.
          </div>
        )}
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>All Deliveries</h3>
        {loading ? (
          <div>Loading deliveries...</div>
        ) : deliveries.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No deliveries found.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Delivery</th>
                <th>Type</th>
                <th>Status</th>
                <th>Distance (km)</th>
                <th>Duration (min)</th>
                <th>Update</th>
              </tr>
            </thead>
            <tbody>
              {deliveries.map((delivery) => (
                <tr key={delivery.id}>
                  <td>#{delivery.id}</td>
                  <td>{delivery.delivery_type}</td>
                  <td>{delivery.status}</td>
                  <td>{delivery.total_distance_km?.toFixed(2) ?? "-"}</td>
                  <td>{delivery.total_duration_minutes?.toFixed(1) ?? "-"}</td>
                  <td>
                    <select
                      value={delivery.status}
                      onChange={(event) => void updateDeliveryStatus(delivery.id, event.target.value)}
                    >
                      {deliveryStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default AdminDeliveriesPage;
