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

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

  const cards = [
    { label: 'Catalog Items', value: stats.totalParts, color: 'var(--color-info)', link: '/supplier/inventory' },
    { label: 'Low Stock', value: stats.lowStock, color: 'var(--color-danger)', link: '/supplier/inventory/low-stock' },
    { label: 'Total Orders', value: stats.orders, color: 'var(--color-success)', link: '/supplier/orders' },
    { label: 'Pending', value: stats.pending, color: 'var(--color-warning)', link: '/supplier/orders' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Supplier Dashboard</h1>

      <div className="stagger-children grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map(card => (
          <div
            key={card.label}
            className="surface-card rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md"
            style={{ borderLeft: `4px solid ${card.color}` }}
            onClick={() => navigate(card.link)}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{card.label}</div>
            <div className="text-3xl font-bold mt-2" style={{ color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/supplier/inventory/new')}
          className="surface-card rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:shadow-md"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-2xl mb-1">➕</div>
          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Add New Part</div>
        </button>
        <button
          onClick={() => navigate('/supplier/inventory/upload')}
          className="surface-card rounded-2xl border-2 border-dashed p-6 text-center transition-all hover:shadow-md"
          style={{ borderColor: 'var(--color-border)' }}
        >
          <div className="text-2xl mb-1">📤</div>
          <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Bulk CSV Upload</div>
        </button>
      </div>
    </div>
  );
}
