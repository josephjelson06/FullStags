import { useEffect, useState } from 'react';
import {
  getDeliveries,
  getDeliveryStats,
  updateDeliveryStatus,
  type Delivery,
  type DeliveryStats,
} from '@/services/api/deliveries';

export function RouteMonitor() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [d, s] = await Promise.all([getDeliveries(), getDeliveryStats()]);
      setDeliveries(d);
      setStats(s);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const advance = async (id: number, status: string) => {
    await updateDeliveryStatus(id, status);
    await load();
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading deliveries...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Route Monitor</h1>
        <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 uppercase">Total</div>
            <div className="text-2xl font-bold">{stats.total_deliveries}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 uppercase">In Progress</div>
            <div className="text-2xl font-bold text-yellow-600">{stats.in_progress_deliveries}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 uppercase">Completed</div>
            <div className="text-2xl font-bold text-green-600">{stats.completed_deliveries}</div>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <div className="text-xs text-gray-500 uppercase">Route Savings</div>
            <div className="text-2xl font-bold text-blue-600">{stats.total_savings_percent.toFixed(1)}%</div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Stops</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Distance</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {deliveries.map((d) => (
              <tr key={d.id}>
                <td className="px-6 py-4 text-sm font-medium">#{d.id}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    d.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    d.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {d.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{d.stops?.length ?? 0}</td>
                <td className="px-6 py-4 text-sm">{d.optimized_distance_km?.toFixed(1) ?? '-'} km</td>
                <td className="px-6 py-4 text-sm space-x-2">
                  {d.status === 'PLANNED' && (
                    <button className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-200" onClick={() => void advance(d.id, 'IN_PROGRESS')}>
                      Start
                    </button>
                  )}
                  {d.status === 'IN_PROGRESS' && (
                    <button className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200" onClick={() => void advance(d.id, 'COMPLETED')}>
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {deliveries.length === 0 && (
              <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No deliveries found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
