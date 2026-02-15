import { useEffect, useState } from 'react';
import { getOrders } from '@/services/api/orders';
import { getInventory } from '@/services/api/inventory';

export function SupplierReports() {
  const [data, setData] = useState({
    totalOrders: 0,
    delivered: 0,
    cancelled: 0,
    catalogValue: 0,
    avgLeadTimeHours: 0,
    fulfillmentRate: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [orders, inventory] = await Promise.all([getOrders(), getInventory()]);
        const delivered = orders.filter((row) => row.status === 'DELIVERED').length;
        const cancelled = orders.filter((row) => row.status === 'CANCELLED').length;
        const avgLeadTimeHours = inventory.items.length > 0
          ? inventory.items.reduce((sum, row) => sum + (row.leadTimeHours ?? 0), 0) / inventory.items.length
          : 0;
        const catalogValue = inventory.items.reduce((sum, row) => sum + row.price * row.quantity, 0);
        setData({
          totalOrders: orders.length,
          delivered,
          cancelled,
          catalogValue,
          avgLeadTimeHours,
          fulfillmentRate: orders.length > 0 ? (delivered / orders.length) * 100 : 0,
        });
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) return <div className="py-12 text-center text-gray-400">Loading reports...</div>;

  const cards = [
    { label: 'Total Orders', value: String(data.totalOrders) },
    { label: 'Delivered', value: String(data.delivered), color: 'text-green-600' },
    { label: 'Cancelled', value: String(data.cancelled), color: 'text-red-600' },
    { label: 'Fulfillment Rate', value: `${data.fulfillmentRate.toFixed(1)}%`, color: 'text-blue-600' },
    { label: 'Avg Lead Time', value: `${data.avgLeadTimeHours.toFixed(1)}h` },
    { label: 'Catalog Value', value: `INR ${data.catalogValue.toFixed(0)}` },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Supplier Reports</h1>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <div key={card.label} className="surface-card rounded-2xl p-5">
            <div className="text-xs uppercase text-gray-400">{card.label}</div>
            <div className={`mt-1 text-3xl font-bold ${card.color ?? ''}`}>{card.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
