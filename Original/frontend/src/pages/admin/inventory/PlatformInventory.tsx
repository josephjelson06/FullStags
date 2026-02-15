import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';

interface CatalogItem { id: number; supplier_id: number; supplier_name?: string; part_name: string; part_number: string; brand: string; unit_price: number; quantity_in_stock: number; lead_time_hours: number; }

export function PlatformInventory() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try { const data = await request<CatalogItem[]>('/api/inventory/catalog/all'); setItems(data); }
      catch { /* endpoint may not exist ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â show empty */ }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const filtered = items.filter(i => !search || i.part_name.toLowerCase().includes(search.toLowerCase()) || i.part_number.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="text-center py-12 text-gray-400">Loading inventory...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Platform Inventory</h1>
        <div className="text-sm text-gray-400">{items.length} total items</div>
      </div>

      <input
        type="text"
        placeholder="Search parts..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full rounded-lg  px-4 py-2 text-sm"
      />

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">{items.length === 0 ? 'No inventory data available.' : 'No matching parts.'}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Part</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Part #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {filtered.map(item => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm font-medium">{item.part_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{item.part_number}</td>
                  <td className="px-6 py-4 text-sm">{item.brand || 'ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â'}</td>
                  <td className="px-6 py-4 text-sm">ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¹{item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={item.quantity_in_stock <= 5 ? 'text-red-600 font-medium' : ''}>{item.quantity_in_stock}</span>
                  </td>
                  <td className="px-6 py-4 text-sm">{item.lead_time_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
