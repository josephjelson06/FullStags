import { useEffect, useState } from 'react';
import { getOrders } from '@/services/api/orders';
import { useNavigate } from 'react-router-dom';

interface Order { id: number; status: string; urgency: string; created_at: string; items?: { id: number }[]; }

export function BuyerDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const data = await getOrders(); setOrders(data as unknown as Order[]); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const total = orders.length;
  const active = orders.filter(o => ['PLACED', 'MATCHED', 'IN_DELIVERY'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  const critical = orders.filter(o => o.urgency === 'critical').length;

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Buyer Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Total Orders</div>
          <div className="text-3xl font-bold mt-1">{total}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Active</div>
          <div className="text-3xl font-bold mt-1 text-yellow-600">{active}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Delivered</div>
          <div className="text-3xl font-bold mt-1 text-green-600">{delivered}</div>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <div className="text-xs text-gray-500 uppercase">Critical</div>
          <div className="text-3xl font-bold mt-1 text-red-600">{critical}</div>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent Orders</h2>
          <button onClick={() => navigate('/buyer/orders')} className="text-sm text-blue-600 hover:underline">View All</button>
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {orders.slice(0, 5).map(o => (
            <div key={o.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer" onClick={() => navigate(`/buyer/orders/${o.id}`)}>
              <div>
                <span className="font-medium">Order #{o.id}</span>
                <span className="ml-2 text-sm text-gray-500 capitalize">{o.urgency}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  o.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                  o.status === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>{o.status}</span>
                <span className="text-xs text-gray-400">{new Date(o.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {orders.length === 0 && <div className="px-6 py-8 text-center text-gray-500">No orders yet. Place your first order!</div>}
        </div>
      </div>
    </div>
  );
}
