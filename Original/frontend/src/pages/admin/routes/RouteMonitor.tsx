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
      const [deliveryRows, statsRow] = await Promise.all([getDeliveries(), getDeliveryStats()]);
      setDeliveries(deliveryRows);
      setStats(statsRow);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const advance = async (id: number, status: 'IN_PROGRESS' | 'COMPLETED') => {
    await updateDeliveryStatus(id, status);
    await load();
  };

  if (loading) return <div className="py-12 text-center text-gray-400">Loading deliveries...</div>;

  const inProgressCount = deliveries.filter((delivery) => delivery.status === 'IN_PROGRESS').length;
  const completedCount = deliveries.filter((delivery) => delivery.status === 'COMPLETED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Route Monitor</h1>
        <button className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200" onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Total</div>
          <div className="text-3xl font-bold">{deliveries.length}</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">In Progress</div>
          <div className="text-3xl font-bold text-yellow-600">{inProgressCount}</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Completed</div>
          <div className="text-3xl font-bold text-green-600">{completedCount}</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Route Savings</div>
          <div className="text-3xl font-bold text-blue-600">{stats?.total_savings_percent.toFixed(1) ?? '0.0'}%</div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <table className="min-w-full divide-y">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Stops</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Distance</th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-transparent">
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <td className="px-6 py-4 text-sm font-medium">#{delivery.id}</td>
                <td className="px-6 py-4 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      delivery.status === 'COMPLETED'
                        ? 'bg-green-100 text-green-800'
                        : delivery.status === 'IN_PROGRESS'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {delivery.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">{delivery.stops?.length ?? 0}</td>
                <td className="px-6 py-4 text-sm">{delivery.optimized_distance_km?.toFixed(1) ?? '-'} km</td>
                <td className="space-x-2 px-6 py-4 text-sm">
                  {delivery.status === 'PLANNED' ? (
                    <button
                      className="rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-700 hover:bg-yellow-200"
                      onClick={() => void advance(delivery.id, 'IN_PROGRESS')}
                    >
                      Start
                    </button>
                  ) : null}
                  {delivery.status === 'IN_PROGRESS' ? (
                    <button
                      className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200"
                      onClick={() => void advance(delivery.id, 'COMPLETED')}
                    >
                      Complete
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
            {deliveries.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No deliveries found.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
