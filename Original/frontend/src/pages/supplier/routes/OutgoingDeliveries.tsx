import { useEffect, useState } from 'react';
import { getDeliveries, updateDeliveryStatus, type Delivery } from '@/services/api/deliveries';

export function OutgoingDeliveries() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const data = await getDeliveries(); setDeliveries(data); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const transition = async (id: number, status: Delivery['status']) => {
    await updateDeliveryStatus(id, status);
    setDeliveries(prev => prev.map(d => d.id === id ? { ...d, status } : d));
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading deliveries...</div>;

  const planned = deliveries.filter(d => d.status === 'PLANNED');
  const active = deliveries.filter(d => d.status === 'IN_PROGRESS');
  const completed = deliveries.filter(d => d.status === 'COMPLETED');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Outgoing Deliveries</h1>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Planned</div>
          <div className="text-2xl font-bold text-yellow-600">{planned.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">In Progress</div>
          <div className="text-2xl font-bold text-blue-600">{active.length}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completed.length}</div>
        </div>
      </div>

      {deliveries.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No deliveries assigned.</div>
      ) : (
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
              {deliveries.map(d => (
                <tr key={d.id}>
                  <td className="px-6 py-4 text-sm font-medium">#{d.id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      d.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                      d.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>{d.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{d.stops?.length ?? 0}</td>
                  <td className="px-6 py-4 text-sm">{d.optimized_distance_km?.toFixed(1) ?? '—'} km</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {d.status === 'PLANNED' && <button onClick={() => void transition(d.id, 'IN_PROGRESS')} className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-700 hover:bg-blue-200">Start</button>}
                    {d.status === 'IN_PROGRESS' && <button onClick={() => void transition(d.id, 'COMPLETED')} className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200">Complete</button>}
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
