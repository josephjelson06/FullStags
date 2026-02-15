import { useEffect, useState } from 'react';
import { getOrders } from '@/services/api/orders';
import { getInventory } from '@/services/api/inventory';

export function SupplierReports() {
  const [data, setData] = useState<{ totalOrders: number; delivered: number; cancelled: number; revenue: number; avgLeadTime: number; fulfillmentRate: number }>({ totalOrders: 0, delivered: 0, cancelled: 0, revenue: 0, avgLeadTime: 0, fulfillmentRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [orders, inv] = await Promise.all([getOrders(), getInventory()]);
        const orderArr = orders as unknown as { status: string }[];
        const items = ((inv as unknown) as { items?: { lead_time_hours: number; unit_price: number }[] }).items ?? [];
        const delivered = orderArr.filter(o => o.status === 'DELIVERED').length;
        const cancelled = orderArr.filter(o => o.status === 'CANCELLED').length;
        const avgLead = items.length > 0 ? items.reduce((s, i) => s + i.lead_time_hours, 0) / items.length : 0;
        setData({
          totalOrders: orderArr.length,
          delivered,
          cancelled,
          revenue: items.reduce((s, i) => s + i.unit_price, 0),
          avgLeadTime: avgLead,
          fulfillmentRate: orderArr.length > 0 ? (delivered / orderArr.length) * 100 : 0,
        });
      } catch { /* empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="text-center py-12 text-gray-400">Loading reports...</div>;

  const cards = [
    { label: 'Total Orders', value: data.totalOrders, fmt: String(data.totalOrders) },
    { label: 'Delivered', value: data.delivered, fmt: String(data.delivered), color: 'text-green-600' },
    { label: 'Cancelled', value: data.cancelled, fmt: String(data.cancelled), color: 'text-red-600' },
    { label: 'Fulfillment Rate', value: data.fulfillmentRate, fmt: `${data.fulfillmentRate.toFixed(1)}%`, color: 'text-blue-600' },
    { label: 'Avg Lead Time', value: data.avgLeadTime, fmt: `${data.avgLeadTime.toFixed(1)}h` },
    { label: 'Catalog Value', value: data.revenue, fmt: `â‚¹${data.revenue.toFixed(0)}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Supplier Reports</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map(c => (
          <div key={c.label} className="surface-card rounded-2xl p-5">
            <div className="text-xs text-gray-400 uppercase">{c.label}</div>
            <div className={`text-3xl font-bold mt-1 ${c.color ?? ''}`}>{c.fmt}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
