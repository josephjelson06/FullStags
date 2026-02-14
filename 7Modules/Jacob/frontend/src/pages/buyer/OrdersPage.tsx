import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOrders } from "../../api/orders";
import { OrderRecord } from "../../types/order";

type TabKey = "active" | "completed" | "cancelled";

const statusBadgeClass = (status: string) => {
  if (["DELIVERED"].includes(status)) return "tag green";
  if (["CANCELLED"].includes(status)) return "tag red";
  return "tag yellow";
};

const urgencyBadgeClass = (urgency: string) => {
  if (urgency === "critical") return "tag red";
  if (urgency === "urgent") return "tag yellow";
  return "tag green";
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("active");
  const navigate = useNavigate();

  const loadOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listOrders({ page: 1, pageSize: 100 });
      setOrders(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, []);

  const tabbedOrders = useMemo(() => {
    if (tab === "active") {
      return orders.filter((order) => !["DELIVERED", "CANCELLED"].includes(order.status));
    }
    if (tab === "completed") {
      return orders.filter((order) => order.status === "DELIVERED");
    }
    return orders.filter((order) => order.status === "CANCELLED");
  }, [orders, tab]);

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <h1 style={{ marginTop: 0 }}>My Orders</h1>
          <p style={{ marginBottom: 0, color: "var(--muted)" }}>
            Track active procurements and completed order history.
          </p>
        </div>
        <button className="button" onClick={() => navigate("/buyer/create-order")}>Create New Order</button>
      </div>

      <div className="card" style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
        <button className={`button ${tab === "active" ? "" : "ghost"}`} onClick={() => setTab("active")}>
          Active Orders
        </button>
        <button className={`button ${tab === "completed" ? "" : "ghost"}`} onClick={() => setTab("completed")}>
          Completed
        </button>
        <button className={`button ${tab === "cancelled" ? "" : "ghost"}`} onClick={() => setTab("cancelled")}>
          Cancelled
        </button>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>{error}</div>
      ) : null}

      {loading ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {tabbedOrders.map((order) => (
            <article key={order.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <h3 style={{ margin: 0 }}>Order #{order.id}</h3>
                <span className={statusBadgeClass(order.status)}>{order.status}</span>
              </div>
              <div>
                <span className={urgencyBadgeClass(order.urgency)}>{order.urgency.toUpperCase()}</span>
              </div>
              <div style={{ color: "var(--muted)" }}>Created: {order.created_at ?? "-"}</div>
              <div>Items: {order.total_items}</div>
              <div>Estimated value: Rs {order.total_value.toLocaleString()}</div>
              <button className="button secondary" onClick={() => navigate(`/orders/${order.id}`)}>
                View Order Detail
              </button>
            </article>
          ))}

          {tabbedOrders.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)" }}>
              No orders in this tab.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
