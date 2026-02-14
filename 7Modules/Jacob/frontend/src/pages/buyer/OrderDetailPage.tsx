import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getOrder, transitionOrderStatus } from "../../api/orders";
import { OrderRecord } from "../../types/order";

const timelineSteps = [
  "PLACED",
  "MATCHED",
  "CONFIRMED",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
];

const statusRank: Record<string, number> = {
  PLACED: 0,
  MATCHED: 1,
  CONFIRMED: 2,
  DISPATCHED: 3,
  IN_TRANSIT: 4,
  DELIVERED: 5,
  CANCELLED: 6,
};

const statusTag = (status: string) => {
  if (status === "DELIVERED") return "tag green";
  if (status === "CANCELLED") return "tag red";
  return "tag yellow";
};

export default function OrderDetailPage() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioning, setActioning] = useState(false);

  const currentRole = useMemo(() => {
    try {
      const raw =
        localStorage.getItem("auth_user") ||
        localStorage.getItem("x-test-user") ||
        "{}";
      const parsed = JSON.parse(raw);
      return parsed.role as string | undefined;
    } catch {
      return undefined;
    }
  }, []);

  const loadOrder = async () => {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await getOrder(Number(orderId));
      setOrder(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load order");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrder();
  }, [orderId]);

  const cancellable =
    currentRole === "buyer" && order && ["PLACED", "MATCHED", "CONFIRMED"].includes(order.status);

  const cancelOrder = async () => {
    if (!order) return;
    const confirmed = window.confirm(`Cancel Order #${order.id}?`);
    if (!confirmed) return;

    setActioning(true);
    setError(null);
    try {
      await transitionOrderStatus(order.id, "CANCELLED");
      await loadOrder();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel order");
    } finally {
      setActioning(false);
    }
  };

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
        <button className="button ghost" onClick={() => navigate(-1)}>
          Back
        </button>
        {cancellable ? (
          <button className="button" onClick={cancelOrder} disabled={actioning}>
            {actioning ? "Cancelling..." : "Cancel Order"}
          </button>
        ) : null}
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>{error}</div>
      ) : null}

      {loading || !order ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem" }}>
              <h1 style={{ margin: 0 }}>Order #{order.id}</h1>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <span className={statusTag(order.status)}>{order.status}</span>
                <span className={order.urgency === "critical" ? "tag red" : order.urgency === "urgent" ? "tag yellow" : "tag green"}>
                  {order.urgency.toUpperCase()}
                </span>
              </div>
            </div>
            <p style={{ color: "var(--muted)" }}>
              Buyer: {order.buyer_factory_name ?? "-"} | Created: {order.created_at ?? "-"}
            </p>
            <p style={{ color: "var(--muted)", marginBottom: 0 }}>
              Required Delivery: {order.required_delivery_date ?? "-"}
            </p>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Status Timeline</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.6rem" }}>
              {timelineSteps.map((step) => {
                const active = statusRank[order.status] >= statusRank[step] && order.status !== "CANCELLED";
                return (
                  <div
                    key={step}
                    className="card"
                    style={{
                      padding: "0.6rem",
                      borderColor: active ? "#87c69a" : "var(--border)",
                      background: active ? "#ecfaef" : "#f9f9f7",
                    }}
                  >
                    <strong>{step}</strong>
                  </div>
                );
              })}
              {order.status === "CANCELLED" ? (
                <div className="card" style={{ padding: "0.6rem", borderColor: "#e38b8b", background: "#fff1f1" }}>
                  <strong>CANCELLED</strong>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card" style={{ overflowX: "auto" }}>
            <h3 style={{ marginTop: 0 }}>Order Items</h3>
            <table className="table">
              <thead>
                <tr>
                  <th>Part #</th>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Status</th>
                  <th>Assigned Supplier</th>
                  <th>Assigned Price</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => {
                  const selected =
                    item.assignments.find((assignment) => ["ACCEPTED", "FULFILLED"].includes(assignment.status)) ??
                    item.assignments.find((assignment) => assignment.status === "PROPOSED");
                  return (
                    <tr key={item.id}>
                      <td>{item.part_number}</td>
                      <td>{item.part_description ?? "-"}</td>
                      <td>{item.quantity}</td>
                      <td>{item.status}</td>
                      <td>{selected?.supplier_business_name ?? "-"}</td>
                      <td>{selected?.assigned_price ? `Rs ${selected.assigned_price}` : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Delivery Route (Module 3 Placeholder)</h3>
            <div
              style={{
                minHeight: "180px",
                border: "2px dashed var(--border)",
                borderRadius: "12px",
                display: "grid",
                placeItems: "center",
                background: "#f8fafb",
                color: "var(--muted)",
              }}
            >
              Delivery route visualization will appear here once Module 3 is integrated.
            </div>
          </div>
        </>
      )}
    </section>
  );
}
