import { useEffect, useState } from 'react';
import { getInventory } from '@/services/api/inventory';
import { getOrders } from '@/services/api/orders';
import { useNavigate } from 'react-router-dom';

export function SupplierDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalParts: 0, lowStock: 0, orders: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [inv, orders] = await Promise.all([getInventory(), getOrders()]);
        const items = ((inv as unknown) as { items?: { quantity_in_stock: number }[] }).items ?? [];
        const orderArr = orders as unknown as { status: string }[];
        setStats({
          totalParts: items.length,
          lowStock: items.filter(i => i.quantity_in_stock <= 5).length,
          orders: orderArr.length,
          pending: orderArr.filter(o => ['PLACED', 'MATCHED'].includes(o.status)).length,
        });
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Supplier Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Catalog Items', value: stats.totalParts, color: 'text-blue-600', link: '/supplier/inventory' },
          { label: 'Low Stock', value: stats.lowStock, color: 'text-red-600', link: '/supplier/inventory/low-stock' },
          { label: 'Total Orders', value: stats.orders, color: 'text-green-600', link: '/supplier/orders' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600', link: '/supplier/orders' },
        ].map(card => (
          <div key={card.label} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900 cursor-pointer hover:border-blue-300 transition" onClick={() => navigate(card.link)}>
            <div className="text-xs text-gray-500 uppercase">{card.label}</div>
            <div className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button onClick={() => navigate('/supplier/inventory/new')} className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400 transition dark:border-gray-600">
          <div className="text-2xl mb-1">➕</div>
          <div className="font-medium">Add New Part</div>
        </button>
        <button onClick={() => navigate('/supplier/inventory/upload')} className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center hover:border-blue-400 transition dark:border-gray-600">
          <div className="text-2xl mb-1">📤</div>
          <div className="font-medium">Bulk CSV Upload</div>
        </button>
      </div>
    </div>
  );
}
