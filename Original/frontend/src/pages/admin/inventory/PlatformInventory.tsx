import { useEffect, useState } from 'react';
import { getSuppliers, getSupplierCatalog } from '@/services/api/suppliers';
import type { CatalogEntryDto } from '@/services/api/contracts';

interface PlatformCatalogItem extends CatalogEntryDto {
  supplier_name: string;
}

export function PlatformInventory() {
  const [items, setItems] = useState<PlatformCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const suppliers = await getSuppliers();
        const catalogs = await Promise.all(
          suppliers.map(async (supplier) => {
            const response = await getSupplierCatalog(supplier.id, 1, 200);
            return response.items.map((item) => ({
              ...item,
              supplier_name: supplier.business_name,
            }));
          }),
        );
        setItems(catalogs.flat());
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filtered = items.filter((item) => {
    if (!search) return true;
    const value = search.toLowerCase();
    return item.part_name.toLowerCase().includes(value) || item.part_number.toLowerCase().includes(value);
  });

  if (loading) return <div className="py-12 text-center text-gray-400">Loading inventory...</div>;

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
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-lg px-4 py-2 text-sm"
      />

      {filtered.length === 0 ? (
        <div className="py-12 text-center text-gray-400">{items.length === 0 ? 'No inventory data available.' : 'No matching parts.'}</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Part</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Part #</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Brand</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Price</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-400">Lead Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {filtered.map((item) => (
                <tr key={`${item.supplier_id}-${item.id}`}>
                  <td className="px-6 py-4 text-sm font-medium">{item.supplier_name}</td>
                  <td className="px-6 py-4 text-sm font-medium">{item.part_name}</td>
                  <td className="px-6 py-4 text-sm text-gray-400">{item.part_number}</td>
                  <td className="px-6 py-4 text-sm">{item.brand || '-'}</td>
                  <td className="px-6 py-4 text-sm">{item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm">
                    <span className={item.quantity_in_stock <= 5 ? 'font-medium text-red-600' : ''}>{item.quantity_in_stock}</span>
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
