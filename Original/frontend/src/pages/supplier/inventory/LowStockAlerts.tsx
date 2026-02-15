import { useEffect, useState } from 'react';
import { getInventory } from '@/services/api/inventory';
import { useNavigate } from 'react-router-dom';

interface Item { id: number; part_name: string; part_number: string; quantity_in_stock: number; unit_price: number; }

export function LowStockAlerts() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(10);

  useEffect(() => {
    const load = async () => {
      try {
        const inv = await getInventory();
        const all = ((inv as unknown) as { items?: Item[] }).items ?? [];
        setItems(all.filter(i => i.quantity_in_stock <= threshold));
      } finally { setLoading(false); }
    };
    load();
  }, [threshold]);

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Low Stock Alerts</h1>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">Threshold ≤</label>
          <input type="number" min="1" value={threshold} onChange={e => setThreshold(parseInt(e.target.value) || 10)} className="w-20 rounded border border-gray-300 px-2 py-1 text-sm dark:border-gray-600 dark:bg-gray-800" />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-2">✅</div>
          <p>No items below threshold.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
              <div>
                <div className="font-medium">{item.part_name}</div>
                <div className="text-sm text-gray-500">#{item.part_number} · ₹{item.unit_price.toFixed(2)}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`text-2xl font-bold ${item.quantity_in_stock === 0 ? 'text-red-700' : 'text-orange-600'}`}>{item.quantity_in_stock}</div>
                  <div className="text-xs text-gray-500">in stock</div>
                </div>
                <button onClick={() => navigate(`/supplier/inventory/${item.id}/edit`)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">Restock</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
