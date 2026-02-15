import { useEffect, useState } from 'react';
import { getDeliveries, type Delivery } from '@/services/api/deliveries';

export function RouteHistory() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await getDeliveries();
        setDeliveries(all.filter((delivery) => delivery.status === 'COMPLETED'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Route History</h1>
      <p className="text-sm text-gray-400">{deliveries.length} completed deliveries</p>

      {deliveries.length === 0 ? (
        <div className="py-12 text-center text-gray-400">No completed deliveries yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Stops</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Naive Dist</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Optimized</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Savings</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {deliveries.map((delivery) => {
                const savings = delivery.naive_distance_km && delivery.optimized_distance_km
                  ? ((delivery.naive_distance_km - delivery.optimized_distance_km) / delivery.naive_distance_km) * 100
                  : null;
                return (
                  <tr key={delivery.id}>
                    <td className="px-6 py-4 text-sm font-medium">#{delivery.id}</td>
                    <td className="px-6 py-4 text-sm">{delivery.stops?.length ?? 0}</td>
                    <td className="px-6 py-4 text-sm">{delivery.naive_distance_km?.toFixed(1) ?? '-'} km</td>
                    <td className="px-6 py-4 text-sm">{delivery.optimized_distance_km?.toFixed(1) ?? '-'} km</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">{savings?.toFixed(1) ?? '-'}%</td>
                    <td className="px-6 py-4 text-sm">
                      {delivery.created_at ? new Date(delivery.created_at).toLocaleDateString() : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
