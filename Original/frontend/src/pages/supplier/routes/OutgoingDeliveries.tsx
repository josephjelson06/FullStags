import { useEffect, useState } from 'react';
import { getDeliveries, type Delivery } from '@/services/api/deliveries';

export function OutgoingDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getDeliveries();
        setDeliveries(data);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading deliveries...</div>;

  const planned = deliveries.filter((delivery) => delivery.status === 'PLANNED');
  const active = deliveries.filter((delivery) => delivery.status === 'IN_PROGRESS');
  const completed = deliveries.filter((delivery) => delivery.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Outgoing Deliveries</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Planned</div>
          <div className="text-3xl font-bold text-yellow-600">{planned.length}</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">In Progress</div>
          <div className="text-3xl font-bold text-blue-600">{active.length}</div>
        </div>
        <div className="surface-card rounded-2xl p-4">
          <div className="text-xs uppercase text-gray-400">Completed</div>
          <div className="text-3xl font-bold text-green-600">{completed.length}</div>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No deliveries assigned.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Stops</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Distance</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">ETA</th>
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
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-yellow-100 text-yellow-800'
                      }`}
                    >
                      {delivery.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">{delivery.stops?.length ?? 0}</td>
                  <td className="px-6 py-4 text-sm">{delivery.optimized_distance_km?.toFixed(1) ?? '-'} km</td>
                  <td className="px-6 py-4 text-sm">
                    {delivery.latest_eta ? new Date(delivery.latest_eta).toLocaleString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
