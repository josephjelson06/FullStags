import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';

interface OrderRow { id: number; status: string; urgency: string; created_at: string; buyer_name?: string; total_items?: number; }

export function DisputedOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await request<OrderRow[]>('/api/orders');
        setOrders(all.filter(o => ['DISPUTED', 'CANCELLED'].includes(o.status)));
      } finally { setLoading(false); }
    };
    load();
  }, []);

  const resolve = async (id: number, status: string) => {
    await request(`/api/orders/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Disputed & Cancelled Orders</h1>
      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">ÃƒÂ¢Ã…â€œÃ¢â‚¬Â¦</div>
          <p>No disputed or cancelled orders.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {orders.map(o => (
                <tr key={o.id}>
                  <td className="px-6 py-4 text-sm font-medium">#{o.id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${o.status === 'DISPUTED' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'}`}>{o.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">{o.urgency}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-sm space-x-2">
                    {o.status === 'DISPUTED' && (
                      <>
                        <button className="rounded bg-green-100 px-2 py-1 text-xs text-green-700 hover:bg-green-200" onClick={() => void resolve(o.id, 'MATCHED')}>Resolve</button>
                        <button className="rounded bg-red-100 px-2 py-1 text-xs text-red-700 hover:bg-red-200" onClick={() => void resolve(o.id, 'CANCELLED')}>Cancel</button>
                      </>
                    )}
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
