import { useEffect, useMemo, useState } from "react";
import { getBuyerOrderMap, getBuyerSummary, BuyerRoute, BuyerSummary } from "../../api/analytics";
import { OrdersListResponse, OrderRecord } from "../../types/order";
import { listOrders } from "../../api/orders";

type StatusCount = Record<string, number>;

function PieChart({ data }: { data: StatusCount }) {
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((acc, [, v]) => acc + v, 0);
  if (!total) return <div style={{ color: "var(--muted)" }}>No data</div>;

  let cumulative = 0;
  return (
    <svg width="220" height="220" viewBox="0 0 32 32">
      {entries.map(([key, value], idx) => {
        const fraction = value / total;
        const start = cumulative;
        const end = cumulative + fraction;
        cumulative = end;
        const x1 = 16 + 16 * Math.sin(2 * Math.PI * start);
        const y1 = 16 - 16 * Math.cos(2 * Math.PI * start);
        const x2 = 16 + 16 * Math.sin(2 * Math.PI * end);
        const y2 = 16 - 16 * Math.cos(2 * Math.PI * end);
        const large = fraction > 0.5 ? 1 : 0;
        const d = `M16 16 L ${x1} ${y1} A 16 16 0 ${large} 1 ${x2} ${y2} Z`;
        const colors = ["#5b8def", "#60c39a", "#f2c94c", "#eb5757", "#9b51e0", "#2d9cdb"];
        return <path key={key} d={d} fill={colors[idx % colors.length]} stroke="#fff" strokeWidth="0.3" />;
      })}
    </svg>
  );
}

export default function BuyerDashboard() {
  const [summary, setSummary] = useState<BuyerSummary | null>(null);
  const [routes, setRoutes] = useState<BuyerRoute[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getBuyerSummary(),
      getBuyerOrderMap(),
      listOrders({ page: 1, pageSize: 10 }),
    ])
      .then(([summaryRes, mapRes, ordersRes]) => {
        setSummary(summaryRes);
        setRoutes(mapRes.routes || []);
        setOrders((ordersRes as OrdersListResponse).items || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const statusCounts: StatusCount = useMemo(() => {
    const counts: StatusCount = {};
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Buyer Dashboard</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>Live order KPIs and delivery visibility</p>
        </div>
      </div>

      {error ? <div className="card" style={{ color: "#8b1b1b", borderColor: "#e38b8b" }}>{error}</div> : null}

      {loading ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <>
          <div className="grid" style={{ gap: "1rem", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <MetricCard title="Active Orders" value={summary?.active_orders ?? 0} />
            <MetricCard title="Pending Deliveries" value={summary?.pending_deliveries ?? 0} />
            <MetricCard title="Avg Delivery (hrs)" value={summary?.avg_delivery_hours ?? 0} />
            <MetricCard title="Total Spend" value={`₹ ${summary?.total_spend?.toLocaleString() ?? 0}`} />
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Order Tracking Map</h3>
            {routes.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No active routes yet.</div>
            ) : (
              <div style={{ display: "grid", gap: "0.6rem" }}>
                {routes.map((route) => (
                  <div
                    key={`${route.order_id}-${route.supplier.lat}-${route.supplier.lng}`}
                    className="card"
                    style={{ background: "#f8fafb" }}
                  >
                    <strong>Order #{route.order_id}</strong> — {route.status}
                    <div style={{ fontSize: "0.9rem", color: "var(--muted)" }}>
                      Buyer ({route.buyer.lat.toFixed(2)}, {route.buyer.lng.toFixed(2)}) → Supplier{" "}
                      ({route.supplier.lat.toFixed(2)}, {route.supplier.lng.toFixed(2)})
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Order History</h3>
            <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: "1rem", alignItems: "center" }}>
              <PieChart data={statusCounts} />
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Urgency</th>
                      <th>Created</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.status}</td>
                        <td>{o.urgency}</td>
                        <td>{o.created_at ?? "-"}</td>
                        <td>{o.updated_at ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function MetricCard({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="card" style={{ background: "#0f172a", color: "white" }}>
      <div style={{ opacity: 0.7, fontSize: "0.95rem" }}>{title}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
