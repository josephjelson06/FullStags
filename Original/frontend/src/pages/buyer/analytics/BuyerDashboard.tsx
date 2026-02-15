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
  const active = orders.filter(o => ['PLACED', 'MATCHED', 'CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(o.status)).length;
  const delivered = orders.filter(o => o.status === 'DELIVERED').length;
  const critical = orders.filter(o => o.urgency === 'critical').length;

  if (loading) return <div className="text-center py-12" style={{ color: 'var(--color-text-muted)' }}>Loading dashboard...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>Buyer Dashboard</h1>

      <div className="stagger-children grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Orders', value: total, color: 'var(--color-primary)' },
          { label: 'Active', value: active, color: 'var(--color-warning)' },
          { label: 'Delivered', value: delivered, color: 'var(--color-success)' },
          { label: 'Critical', value: critical, color: 'var(--color-danger)' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="surface-card rounded-2xl p-5 transition-all hover:shadow-md"
            style={{ borderLeft: `4px solid ${stat.color}` }}
          >
            <div className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>{stat.label}</div>
            <div className="text-3xl font-bold mt-2" style={{ color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="surface-card rounded-2xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--color-border)' }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>Recent Orders</h2>
          <button
            onClick={() => navigate('/buyer/orders')}
            className="text-sm font-semibold transition-colors hover:underline"
            style={{ color: 'var(--color-primary)' }}
          >
            View All
          </button>
        </div>
        <div>
          {orders.slice(0, 5).map(o => (
            <div
              key={o.id}
              className="px-6 py-4 flex items-center justify-between cursor-pointer transition-all"
              style={{ borderBottom: '1px solid var(--color-border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              onClick={() => navigate(`/buyer/orders/${o.id}`)}
            >
              <div>
                <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>Order #{o.id}</span>
                <span className="ml-2 text-sm capitalize" style={{ color: 'var(--color-text-muted)' }}>{o.urgency}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  o.status === 'DELIVERED' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  o.status === 'CANCELLED' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                }`}>{o.status}</span>
                <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{new Date(o.created_at ?? Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="px-6 py-8 text-center" style={{ color: 'var(--color-text-muted)' }}>
              No orders yet. Place your first order!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
