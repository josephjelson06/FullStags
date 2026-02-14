import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import type { Order } from "../../types";

const MyOrdersPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const response = await api.get<Order[]>("/orders/");
      setOrders(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrders();
  }, []);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>My Orders</h2>
        <button className="secondary" onClick={() => void fetchOrders()}>
          Refresh
        </button>
      </div>
      {loading ? (
        <div>Loading orders...</div>
      ) : orders.length === 0 ? (
        <div style={{ color: "var(--muted)" }}>No orders yet.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Status</th>
              <th>Urgency</th>
              <th>Items</th>
              <th>Action</th>
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
                  <button className="secondary" onClick={() => navigate(`/orders/${order.id}`)}>
                    Track
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

export default MyOrdersPage;
