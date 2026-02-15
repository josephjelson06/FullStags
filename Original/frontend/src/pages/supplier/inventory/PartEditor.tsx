import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { addInventoryItem, updateInventoryItem, getInventory } from '@/services/api/inventory';

export function PartEditor() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(itemId);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ part_name: '', part_number: '', brand: '', category: '', unit_price: '', quantity_in_stock: '', lead_time_hours: '' });

  useEffect(() => {
    if (!isEdit) return;
    const load = async () => {
      try {
        const inv = await getInventory();
        const items = ((inv as unknown) as { items?: Record<string, unknown>[] }).items ?? [];
        const item = items.find((i: Record<string, unknown>) => String(i.id) === itemId);
        if (item) {
          setForm({
            part_name: String(item.part_name ?? ''),
            part_number: String(item.part_number ?? ''),
            brand: String(item.brand ?? ''),
            category: String(item.category ?? ''),
            unit_price: String(item.unit_price ?? ''),
            quantity_in_stock: String(item.quantity_in_stock ?? ''),
            lead_time_hours: String(item.lead_time_hours ?? ''),
          });
        }
      } finally { setLoading(false); }
    };
    load();
  }, [itemId, isEdit]);

  const submit = async () => {
    if (!form.part_name || !form.part_number) { setError('Part name and number are required.'); return; }
    setSubmitting(true); setError(null);
    try {
      const payload = {
        part_name: form.part_name,
        part_number: form.part_number,
        brand: form.brand,
        category: form.category,
        unit_price: parseFloat(form.unit_price) || 0,
        quantity_in_stock: parseInt(form.quantity_in_stock) || 0,
        lead_time_hours: parseInt(form.lead_time_hours) || 24,
      };
      if (isEdit) await updateInventoryItem(itemId!, payload as never);
      else await addInventoryItem(payload as never);
      navigate('/supplier/inventory');
    } catch (e) { setError(e instanceof Error ? e.message : 'Failed to save.'); }
    finally { setSubmitting(false); }
  };

  if (loading) return <div className="text-center py-12 text-gray-400">Loading...</div>;

  return (
    <div className="space-y-6 max-w-2xl">
      <button onClick={() => navigate('/supplier/inventory')} className="text-sm text-blue-600 hover:underline">Ã¢â€ Â Back to Inventory</button>
      <h1 className="text-3xl font-bold">{isEdit ? 'Edit Part' : 'Add New Part'}</h1>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}

      <div className="surface-card rounded-2xl p-6 space-y-4">
        {[
          { key: 'part_name', label: 'Part Name', type: 'text' },
          { key: 'part_number', label: 'Part Number', type: 'text' },
          { key: 'brand', label: 'Brand', type: 'text' },
          { key: 'category', label: 'Category', type: 'text' },
          { key: 'unit_price', label: 'Unit Price (Ã¢â€šÂ¹)', type: 'number' },
          { key: 'quantity_in_stock', label: 'Quantity in Stock', type: 'number' },
          { key: 'lead_time_hours', label: 'Lead Time (hours)', type: 'number' },
        ].map(f => (
          <div key={f.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{f.label}</label>
            <input
              type={f.type}
              value={form[f.key as keyof typeof form]}
              onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              className="w-full rounded-lg  px-3 py-2 text-sm"
            />
          </div>
        ))}
      </div>

      <button className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50" onClick={() => void submit()} disabled={submitting}>
        {submitting ? 'Saving...' : isEdit ? 'Update Part' : 'Add Part'}
      </button>
    </div>
  );
}
