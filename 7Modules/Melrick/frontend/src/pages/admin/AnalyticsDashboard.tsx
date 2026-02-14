import { useEffect, useMemo, useState } from "react";

import { fetchAnalyticsSnapshot } from "../../api/client";
import type { AnalyticsSnapshot } from "../../types/analytics";

const asPercent = (value: number) => `${(value * 100).toFixed(1)}%`;

const AnalyticsDashboard = () => {
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [days, setDays] = useState(14);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSnapshot = async (timelineDays: number) => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchAnalyticsSnapshot(timelineDays);
      setSnapshot(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    loadSnapshot(days);
  }, [days]);

  const maxOrderCount = useMemo(
    () => Math.max(1, ...(snapshot?.orders.map((row) => row.count) ?? [1])),
    [snapshot]
  );

  return (
    <div className="page analytics-page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Module 7</p>
          <h1>Operational Analytics</h1>
          <p className="subtitle">KPI summary, matching quality, routing savings, supplier reliability, and risk signals.</p>
        </div>
        <div className="analytics-controls">
          <label htmlFor="timeline-days">Timeline</label>
          <select
            id="timeline-days"
            value={days}
            onChange={(event) => setDays(Number(event.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={14}>Last 14 days</option>
            <option value={30}>Last 30 days</option>
          </select>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}
      {busy && !snapshot && <p className="hint">Loading analytics...</p>}

      {snapshot && (
        <>
          <section className="analytics-kpi-grid">
            <article className="card kpi-card">
              <span>Total Orders</span>
              <strong>{snapshot.overview.total_orders}</strong>
            </article>
            <article className="card kpi-card">
              <span>Open Orders</span>
              <strong>{snapshot.overview.open_orders}</strong>
            </article>
            <article className="card kpi-card">
              <span>Delivered Orders</span>
              <strong>{snapshot.overview.delivered_orders}</strong>
            </article>
            <article className="card kpi-card">
              <span>Revenue</span>
              <strong>INR {snapshot.overview.total_revenue_inr.toFixed(0)}</strong>
            </article>
            <article className="card kpi-card">
              <span>Avg Match Score</span>
              <strong>{snapshot.overview.avg_match_score.toFixed(2)}</strong>
            </article>
            <article className="card kpi-card">
              <span>Avg Reliability</span>
              <strong>{snapshot.overview.avg_supplier_reliability.toFixed(2)}</strong>
            </article>
            <article className="card kpi-card">
              <span>Low Stock Items</span>
              <strong>{snapshot.overview.low_stock_items}</strong>
            </article>
            <article className="card kpi-card">
              <span>Routing Savings</span>
              <strong>{snapshot.overview.optimization_savings_percent.toFixed(1)}%</strong>
            </article>
          </section>

          <section className="grid">
            <article className="card">
              <h2>Order Status Distribution</h2>
              <div className="analytics-bars">
                {snapshot.orders.map((row) => (
                  <div key={row.status} className="analytics-bar-row">
                    <div className="analytics-bar-label">
                      <span>{row.status}</span>
                      <strong>{row.count}</strong>
                    </div>
                    <div className="analytics-bar-track">
                      <div
                        className="analytics-bar-fill"
                        style={{ width: `${(row.count / maxOrderCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="card">
              <h2>Matching Quality</h2>
              <p className="hint">Items scored: {snapshot.matching.total_items_scored}</p>
              <p className="hint">Avg candidates/item: {snapshot.matching.avg_candidates_per_item.toFixed(2)}</p>
              <p className="hint">Avg top score: {snapshot.matching.avg_top_score.toFixed(2)}</p>
              <p className="hint">Avg selected score: {snapshot.matching.avg_selected_score.toFixed(2)}</p>
              <h3>Top Score by Urgency</h3>
              <div className="analytics-urgency-grid">
                {Object.entries(snapshot.matching.urgency_top_score).map(([urgency, score]) => (
                  <div key={urgency} className="stat-chip">
                    <span>{urgency.toUpperCase()}</span>
                    <strong>{score.toFixed(2)}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="grid">
            <article className="card">
              <h2>Delivery Efficiency</h2>
              <p className="hint">Total deliveries: {snapshot.deliveries.total_deliveries}</p>
              <p className="hint">Planned: {snapshot.deliveries.planned_deliveries}</p>
              <p className="hint">In progress: {snapshot.deliveries.in_progress_deliveries}</p>
              <p className="hint">Completed: {snapshot.deliveries.completed_deliveries}</p>
              <p className="hint">Average distance: {snapshot.deliveries.avg_distance_km.toFixed(2)} km</p>
              <p className="hint">Average duration: {snapshot.deliveries.avg_duration_minutes.toFixed(1)} min</p>
              <p className="hint">
                Savings: {snapshot.deliveries.total_savings_km.toFixed(2)} km ({snapshot.deliveries.total_savings_percent.toFixed(1)}%)
              </p>
            </article>

            <article className="card">
              <h2>Recent Event Timeline</h2>
              <div className="timeline-compact">
                {snapshot.events.length === 0 && <p className="empty">No events in selected timeline window.</p>}
                {snapshot.events.map((point) => (
                  <div key={`${point.day}-${point.event_type}`} className="timeline-compact-row">
                    <span>{point.day}</span>
                    <span>{point.event_type}</span>
                    <strong>{point.count}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="card full">
            <h2>Supplier Performance</h2>
            <div className="table">
              <div className="table__head analytics-table-head">
                <span>Supplier</span>
                <span>Reliability</span>
                <span>Assignments</span>
                <span>Fulfilled</span>
                <span>Rejected</span>
                <span>Fulfillment</span>
                <span>Avg Match</span>
              </div>
              {snapshot.suppliers.map((supplier) => (
                <div key={supplier.supplier_id} className="table__row analytics-table-row">
                  <span>{supplier.supplier_name}</span>
                  <span>{supplier.reliability_score.toFixed(2)}</span>
                  <span>{supplier.assignments_total}</span>
                  <span>{supplier.fulfilled_assignments}</span>
                  <span>{supplier.rejected_assignments}</span>
                  <span>{asPercent(supplier.fulfillment_rate)}</span>
                  <span>{supplier.avg_match_score.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card full">
            <h2>Low Stock Risks</h2>
            {snapshot.low_stock.length === 0 && <p className="empty">No low-stock items detected.</p>}
            {snapshot.low_stock.length > 0 && (
              <div className="table">
                <div className="table__head analytics-table-head">
                  <span>Part Number</span>
                  <span>Part Name</span>
                  <span>Supplier</span>
                  <span>Stock</span>
                  <span>Reorder Point</span>
                </div>
                {snapshot.low_stock.map((item) => (
                  <div key={item.catalog_id} className="table__row analytics-table-row">
                    <span>{item.part_number}</span>
                    <span>{item.part_name}</span>
                    <span>{item.supplier_name}</span>
                    <span>{item.current_stock}</span>
                    <span>{item.reorder_point}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
};

export default AnalyticsDashboard;
