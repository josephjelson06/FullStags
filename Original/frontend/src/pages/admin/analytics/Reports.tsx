import { useEffect, useState } from 'react';
import {
  getAnalyticsKpis,
  getDemandAnalytics,
  getRouteAnalytics,
  getSupplierAnalytics,
  type AnalyticsKpis,
  type DemandAnalytics,
  type RouteAnalytics,
  type SupplierAnalytics,
} from '@/services/api/analytics';

const fmt = (v: number | null | undefined, digits = 1) =>
  v == null ? '-' : v.toFixed(digits);

export function AdminReports() {
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [demand, setDemand] = useState<DemandAnalytics | null>(null);
  const [routes, setRoutes] = useState<RouteAnalytics | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, d, r, s] = await Promise.all([
        getAnalyticsKpis(),
        getDemandAnalytics(),
        getRouteAnalytics(),
        getSupplierAnalytics(),
      ]);
      setKpis(k);
      setDemand(d);
      setRoutes(r);
      setSuppliers(s);
    } catch {
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading analytics…</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analytics & Reports</h1>
        <button
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: kpis?.total_orders ?? '-' },
          { label: 'Active Suppliers', value: kpis?.active_suppliers ?? '-' },
          { label: 'Active Buyers', value: kpis?.active_buyers ?? '-' },
          { label: 'Match Rate', value: `${fmt(kpis?.match_rate_percent)}%` },
          { label: 'Avg Fulfillment', value: `${fmt(kpis?.avg_fulfillment_time_hours)}h` },
          { label: 'Total Revenue', value: `₹${fmt(kpis?.total_revenue, 0)}` },
          { label: 'Delivery Completion', value: `${fmt(kpis?.delivery_completion_rate)}%` },
          { label: 'Route Savings', value: `${fmt(kpis?.route_savings_percent)}%` },
        ].map((card) => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 uppercase tracking-wide">{card.label}</div>
            <div className="text-2xl font-bold mt-1">{card.value}</div>
          </div>
        ))}
      </div>

      {/* Demand by Urgency */}
      {demand && demand.by_urgency && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4">Orders by Urgency</h2>
          <div className="grid grid-cols-3 gap-4">
            {demand.by_urgency.map((item) => (
              <div key={item.urgency} className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
                <div className="text-lg font-bold">{item.count}</div>
                <div className="text-sm text-gray-500 capitalize">{item.urgency}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Route Analytics */}
      {routes && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4">Route Optimization</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-lg font-bold">{fmt(routes.total_distance_km)} km</div>
              <div className="text-sm text-gray-500">Total Distance</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-900/30">
              <div className="text-lg font-bold text-green-700 dark:text-green-400">{fmt(routes.total_savings_km)} km</div>
              <div className="text-sm text-gray-500">Savings</div>
            </div>
            <div className="text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
              <div className="text-lg font-bold">{fmt(routes.avg_stops_per_delivery)}</div>
              <div className="text-sm text-gray-500">Avg Stops/Delivery</div>
            </div>
          </div>
        </div>
      )}

      {/* Top Suppliers */}
      {suppliers && suppliers.top_suppliers && (
        <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="text-lg font-semibold mb-4">Top Suppliers</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Orders Fulfilled</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Reliability</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">Avg Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {suppliers.top_suppliers.map((s) => (
                  <tr key={s.supplier_id}>
                    <td className="px-4 py-2 text-sm font-medium">{s.name}</td>
                    <td className="px-4 py-2 text-sm">{s.orders_fulfilled}</td>
                    <td className="px-4 py-2 text-sm">{fmt(s.reliability_score, 2)}</td>
                    <td className="px-4 py-2 text-sm">{fmt(s.avg_lead_time)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
