import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import type { Order } from "../../types";

const statuses = ["PLACED", "MATCHED", "CONFIRMED", "DISPATCHED", "IN_TRANSIT", "DELIVERED", "CANCELLED"];

const AllOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get<Order[]>("/orders/");
      setOrders(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const updateStatus = async (orderId: number, status: string) => {
    await api.patch(`/orders/${orderId}/status`, { status });
    await loadOrders();
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>All Orders</h2>
        <button className="secondary" onClick={() => void loadOrders()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <div>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No orders found.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Urgency</th>
              <th>Items</th>
              <th>Update</th>
              <th>Tracker</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.status}</td>
                <td>{order.urgency}</td>
                <td>{order.items.length}</td>
                <td>
                  <select
                    value={order.status}
                    onChange={(event) => void updateStatus(order.id, event.target.value)}
                  >
                    {statuses.map((statusValue) => (
                      <option key={statusValue} value={statusValue}>
                        {statusValue}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button className="secondary" onClick={() => navigate(`/orders/${order.id}`)}>
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AllOrdersPage;
