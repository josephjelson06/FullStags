import { useEffect, useState } from 'react';
import { getDeliveries, type Delivery } from '@/services/api/deliveries';

export function RouteHistory() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await getDeliveries();
        setDeliveries(all.filter(d => d.status === 'COMPLETED'));
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Route History</h1>
      <p className="text-sm text-gray-500">{deliveries.length} completed deliveries</p>

      {deliveries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No completed deliveries yet.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-800">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Stops</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Naive Dist</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Optimized</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Savings</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
              {deliveries.map(d => {
                const savings = d.naive_distance_km && d.optimized_distance_km
                  ? ((d.naive_distance_km - d.optimized_distance_km) / d.naive_distance_km * 100).toFixed(1)
                  : '—';
                return (
                  <tr key={d.id}>
                    <td className="px-6 py-4 text-sm font-medium">#{d.id}</td>
                    <td className="px-6 py-4 text-sm">{d.stops?.length ?? 0}</td>
                    <td className="px-6 py-4 text-sm">{d.naive_distance_km?.toFixed(1) ?? '—'} km</td>
                    <td className="px-6 py-4 text-sm">{d.optimized_distance_km?.toFixed(1) ?? '—'} km</td>
                    <td className="px-6 py-4 text-sm font-medium text-green-600">{savings}%</td>
                    <td className="px-6 py-4 text-sm">{new Date(d.created_at).toLocaleDateString()}</td>
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
