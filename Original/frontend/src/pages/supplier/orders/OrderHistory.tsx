import { useEffect, useState } from 'react';
import { getOrders } from '@/services/api/orders';
import { useNavigate } from 'react-router-dom';

interface Order { id: number; status: string; urgency: string; created_at: string; }

export function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const all = await getOrders();
        setOrders((all as unknown as Order[]).filter(o => ['DELIVERED', 'CANCELLED'].includes(o.status)));
      } finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading order history...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Order History</h1>
      <p className="text-sm text-gray-400">{orders.length} completed / cancelled orders</p>

      {orders.length === 0 ? (
        <div className="text-center py-12 text-gray-400">No past orders.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {orders.map(o => (
                <tr key={o.id} className=" cursor-pointer" onClick={() => navigate(`/supplier/orders/${o.id}`)}>
                  <td className="px-6 py-4 text-sm font-medium">#{o.id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${o.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{o.status}</span>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">{o.urgency}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{new Date(o.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
