import { useEffect, useState } from "react";
import api from "../../api/client";
import type { Delivery } from "../../types";

const statuses = ["PLANNED", "IN_PROGRESS", "COMPLETED"];

const SupplierDeliveriesPage = () => {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(false);

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

  const updateStatus = async (deliveryId: number, status: string) => {
    await api.patch(`/deliveries/${deliveryId}/status`, { status });
    await loadDeliveries();
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Supplier Deliveries</h2>
        <button className="secondary" onClick={() => void loadDeliveries()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <div>Loading deliveries...</div>
      ) : deliveries.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No deliveries available.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Delivery</th>
              <th>Type</th>
              <th>Status</th>
              <th>Distance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td>#{delivery.id}</td>
                <td>{delivery.delivery_type}</td>
                <td>{delivery.status}</td>
                <td>{delivery.total_distance_km?.toFixed(2) ?? "-"}</td>
                <td>
                  <select
                    value={delivery.status}
                    onChange={(event) => void updateStatus(delivery.id, event.target.value)}
                  >
                    {statuses.map((statusValue) => (
                      <option key={statusValue} value={statusValue}>
                        {statusValue}
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
  );
};

export default SupplierDeliveriesPage;
