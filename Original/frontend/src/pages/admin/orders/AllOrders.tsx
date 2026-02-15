import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { request } from '@/services/api/client';

interface OrderItem {
  id: number;
  part_name: string;
  quantity: number;
  status: string;
}

interface Order {
  id: number;
  status: string;
  urgency: string;
  items: OrderItem[];
  created_at: string;
}

interface OrdersResponse {
  items: Order[];
  page: number;
  page_size: number;
  total: number;
}

const statuses = ['PLACED', 'MATCHED', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED'];

export function AllOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const response = await request<OrdersResponse>('/api/orders?page_size=100');
      setOrders(response.items ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId: number, newStatus: string) => {
    await request(`/api/orders/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ new_status: newStatus }),
    });
    await loadOrders();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">All Orders</h1>
        <button
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium hover:bg-gray-200"
          onClick={() => void loadOrders()}
        >
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading orders...</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No orders found.</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Urgency</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Update</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">#{order.id}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      order.status === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      order.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                      'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm capitalize">{order.urgency}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{order.items?.length ?? 0}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <select
                      className="rounded border surface-card px-2 py-1 text-sm"
                      value={order.status}
                      onChange={(e) => void updateStatus(order.id, e.target.value)}
                    >
                      {statuses.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <button
                      className="rounded bg-blue-100 px-3 py-1 text-sm text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-300"
                      onClick={() => navigate(`/admin/orders/${order.id}`)}
                    >
                      Open
                    </button>
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
