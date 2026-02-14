import { useEffect, useState } from "react";
import api from "../../api/client";
import type { Delivery } from "../../types";

const DeliveriesPage = () => {
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

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>My Deliveries</h2>
        <button className="secondary" onClick={() => void loadDeliveries()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <div>Loading deliveries...</div>
      ) : deliveries.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No deliveries mapped yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Delivery</th>
              <th>Type</th>
              <th>Status</th>
              <th>Distance (km)</th>
              <th>Duration (min)</th>
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
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default DeliveriesPage;
