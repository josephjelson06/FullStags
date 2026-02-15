import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getInventory } from '@/services/api/inventory';
import { getOrders } from '@/services/api/orders';

export function SupplierDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalParts: 0, lowStock: 0, orders: 0, pending: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [inventory, orders] = await Promise.all([getInventory(), getOrders()]);
        setStats({
          totalParts: inventory.items.length,
          lowStock: inventory.items.filter((item) => item.quantity <= Math.max(5, item.minOrderQuantity ?? 0)).length,
          orders: orders.length,
          pending: orders.filter((order) => ['PLACED', 'MATCHED', 'CONFIRMED'].includes(order.status)).length,
        });
      } catch {
        setStats({ totalParts: 0, lowStock: 0, orders: 0, pending: 0 });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center" style={{ color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

  const cards = [
    { label: 'Catalog Items', value: stats.totalParts, color: 'var(--color-info)', link: '/supplier/inventory' },
    { label: 'Low Stock', value: stats.lowStock, color: 'var(--color-danger)', link: '/supplier/inventory/low-stock' },
    { label: 'Total Orders', value: stats.orders, color: 'var(--color-success)', link: '/supplier/orders' },
    { label: 'Pending', value: stats.pending, color: 'var(--color-warning)', link: '/supplier/orders' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Supplier Dashboard</h1>

      <div className="stagger-children grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="surface-card cursor-pointer rounded-2xl p-5 transition-all hover:shadow-md"
            style={{ borderLeft: `4px solid ${card.color}` }}
            onClick={() => navigate(card.link)}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
            <div className="mt-2 text-3xl font-bold" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/supplier/inventory/new')}
          className="surface-card rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:shadow-md"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="mb-1 text-2xl">+</div>
          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Add New Part</div>
        </button>
        <button
          onClick={() => navigate('/supplier/inventory/upload')}
          className="surface-card rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:shadow-md"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="mb-1 text-2xl">#</div>
          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Bulk CSV Upload</div>
        </button>
      </div>
    </div>
  );
}
