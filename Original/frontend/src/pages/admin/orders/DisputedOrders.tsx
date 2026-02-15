import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';
import type { OrdersListDto } from '@/services/api/contracts';

interface OrderRow {
  id: number;
  status: string;
  urgency: string;
  created_at: string | null;
}

export function DisputedOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await request<OrdersListDto>('/api/orders?page_size=200');
        setOrders(response.items.filter((order) => order.status === 'CANCELLED'));
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Cancelled Orders</h1>
      {orders.length === 0 ? (
        <div className="py-12 text-center text-gray-400">
          <p>No cancelled orders.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
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
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="px-6 py-4 text-sm font-medium">#{order.id}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm capitalize">{order.urgency}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{order.created_at ? new Date(order.created_at).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
