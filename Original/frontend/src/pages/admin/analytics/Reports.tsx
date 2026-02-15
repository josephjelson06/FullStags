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

const fmt = (value: number | null | undefined, digits = 1) => (value == null ? '-' : value.toFixed(digits));

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

  useEffect(() => {
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading analytics...</div>;
  if (error) return <div className="py-12 text-center text-red-500">{error}</div>;

  const completedDeliveries = routes?.deliveries_by_status.find((row) => row.status === 'COMPLETED')?.count ?? 0;
  const totalDeliveries = routes?.deliveries_by_status.reduce((acc, row) => acc + row.count, 0) ?? 0;
  const deliveryCompletionRate = totalDeliveries > 0 ? (completedDeliveries / totalDeliveries) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Analytics & Reports</h1>
        <button
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          onClick={() => void load()}
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: 'Total Orders', value: kpis?.total_orders ?? '-' },
          { label: 'Open Orders', value: kpis?.open_orders ?? '-' },
          { label: 'Delivered', value: kpis?.delivered_orders ?? '-' },
          { label: 'Cancelled', value: kpis?.cancelled_orders ?? '-' },
          { label: 'Active Deliveries', value: kpis?.active_deliveries ?? '-' },
          { label: 'Avg Match Score', value: fmt(kpis?.avg_match_score, 2) },
          { label: 'Delivery Completion', value: `${fmt(deliveryCompletionRate)}%` },
          { label: 'Revenue', value: `INR ${fmt(kpis?.total_revenue_inr, 0)}` },
        ].map((card) => (
          <div key={card.label} className="surface-card rounded-2xl p-4">
            <div className="text-xs uppercase tracking-wide text-gray-400">{card.label}</div>
            <div className="mt-1 text-3xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      {demand ? (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Orders by Urgency</h2>
          <div className="grid grid-cols-3 gap-4">
            {demand.by_urgency.map((item) => (
              <div key={item.urgency} className="rounded-lg bg-gray-50 p-3 text-center">
                <div className="text-lg font-bold">{item.count}</div>
                <div className="text-sm capitalize text-gray-400">{item.urgency}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {routes ? (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Route Optimization</h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-bold">{fmt(routes.total_distance_km)} km</div>
              <div className="text-sm text-gray-400">Total Distance</div>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <div className="text-lg font-bold text-green-700">{fmt(routes.total_savings_km)} km</div>
              <div className="text-sm text-gray-400">Savings</div>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <div className="text-lg font-bold">{fmt(routes.avg_stops_per_delivery)}</div>
              <div className="text-sm text-gray-400">Avg Stops/Delivery</div>
            </div>
          </div>
        </div>
      ) : null}

      {suppliers ? (
        <div className="surface-card rounded-2xl p-6">
          <h2 className="mb-4 text-lg font-semibold">Top Suppliers</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Orders Fulfilled</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Reliability</th>
                  <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-400">Avg Lead Time</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {suppliers.top_suppliers.map((supplier) => (
                  <tr key={supplier.supplier_id}>
                    <td className="px-4 py-2 text-sm font-medium">{supplier.name}</td>
                    <td className="px-4 py-2 text-sm">{supplier.orders_fulfilled}</td>
                    <td className="px-4 py-2 text-sm">{fmt(supplier.reliability_score, 2)}</td>
                    <td className="px-4 py-2 text-sm">{fmt(supplier.avg_lead_time)}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
