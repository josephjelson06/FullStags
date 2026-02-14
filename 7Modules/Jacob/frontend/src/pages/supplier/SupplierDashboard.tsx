import { useEffect, useMemo, useState } from "react";
import {
  getSupplierInventoryStats,
  getSupplierSummary,
  SupplierInventoryStats,
  SupplierSummary,
} from "../../api/analytics";
import { listOrders } from "../../api/orders";
import { OrdersListResponse } from "../../types/order";

function Donut({ data }: { data: { label: string; value: number }[] }) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (!total) return <div style={{ color: "var(--muted)" }}>No data</div>;
  let cumulative = 0;
  return (
    <svg width="220" height="220" viewBox="0 0 36 36">
      {data.map((slice, idx) => {
        const fraction = slice.value / total;
        const start = cumulative;
        const end = cumulative + fraction;
        cumulative = end;
        const startAngle = start * 2 * Math.PI - Math.PI / 2;
        const endAngle = end * 2 * Math.PI - Math.PI / 2;
        const x1 = 18 + 16 * Math.cos(startAngle);
        const y1 = 18 + 16 * Math.sin(startAngle);
        const x2 = 18 + 16 * Math.cos(endAngle);
        const y2 = 18 + 16 * Math.sin(endAngle);
        const large = fraction > 0.5 ? 1 : 0;
        const d = `M18 18 L ${x1} ${y1} A 16 16 0 ${large} 1 ${x2} ${y2} Z`;
        const colors = ["#60c39a", "#5b8def", "#f2c94c", "#eb5757", "#9b51e0", "#2d9cdb"];
        return <path key={slice.label} d={d} fill={colors[idx % colors.length]} stroke="#fff" strokeWidth="0.3" />;
      })}
      <circle cx="18" cy="18" r="8" fill="#f8fafb" />
      <text x="18" y="19" textAnchor="middle" fontSize="4" fill="#334155">
        {total}
      </text>
    </svg>
  );
}

export default function SupplierDashboard() {
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [invStats, setInvStats] = useState<SupplierInventoryStats | null>(null);
  const [incoming, setIncoming] = useState<OrdersListResponse["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      getSupplierSummary(),
      getSupplierInventoryStats(),
      listOrders({ page: 1, pageSize: 10, status: "MATCHED,CONFIRMED" }),
    ])
      .then(([s, inv, orders]) => {
        setSummary(s);
        setInvStats(inv);
        setIncoming((orders as OrdersListResponse).items || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  const donutData = useMemo(
    () =>
      (invStats?.category_breakdown || []).map((c) => ({
        label: c.category,
        value: c.quantity,
      })),
    [invStats]
  );

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0 }}>Supplier Dashboard</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>Inventory and fulfillment performance</p>
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
            <Metric title="Reliability" value={`${summary?.reliability_pct ?? 0}%`} />
            <Metric title="Orders Fulfilled (mo)" value={summary?.orders_fulfilled_month ?? 0} />
            <Metric title="Avg Dispatch (hrs)" value={summary?.avg_dispatch_hours ?? 0} />
            <Metric
              title="Revenue (mo)"
              value={`₹ ${(summary?.revenue_month ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}
            />
          </div>

          <div className="grid" style={{ gap: "1rem", gridTemplateColumns: "minmax(260px, 320px) 1fr" }}>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Inventory Distribution</h3>
              <Donut data={donutData} />
            </div>
            <div className="card">
              <h3 style={{ marginTop: 0 }}>Low Stock Alerts</h3>
              {invStats?.low_stock?.length ? (
                <div className="grid" style={{ gap: "0.6rem" }}>
                  {invStats.low_stock.map((item) => (
                    <div key={item.id} className="card" style={{ background: "#fff8f2" }}>
                      <strong>{item.part_name}</strong> ({item.part_number})
                      <div style={{ color: "var(--muted)" }}>
                        In stock: {item.quantity_in_stock} | Min: {item.min_order_quantity}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: "var(--muted)" }}>No low stock items.</div>
              )}
            </div>
          </div>

          <div className="card">
            <h3 style={{ marginTop: 0 }}>Incoming Orders</h3>
            {incoming.length === 0 ? (
              <div style={{ color: "var(--muted)" }}>No incoming assignments right now.</div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Status</th>
                      <th>Urgency</th>
                      <th>Total Items</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incoming.map((o) => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.status}</td>
                        <td>{o.urgency}</td>
                        <td>{o.total_items}</td>
                        <td>{o.updated_at ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="card" style={{ background: "#0f172a", color: "white" }}>
      <div style={{ opacity: 0.7, fontSize: "0.95rem" }}>{title}</div>
      <div style={{ fontSize: "1.8rem", fontWeight: 700 }}>{value}</div>
    </div>
  );
}
