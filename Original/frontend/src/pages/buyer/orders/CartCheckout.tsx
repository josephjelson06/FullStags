import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createOrder } from '@/services/api/orders';
import { listPartCategories } from '@/services/api/inventory';

interface CartItem {
  categoryId: number | null;
  partNumber: string;
  partDescription: string;
  quantity: number;
}

interface CategoryOption {
  id: number;
  name: string;
  subcategory: string | null;
}

export function CartCheckout() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [items, setItems] = useState<CartItem[]>([{ categoryId: null, partNumber: '', partDescription: '', quantity: 1 }]);
  const [urgency, setUrgency] = useState<'standard' | 'urgent' | 'critical'>('standard');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const data = await listPartCategories();
        setCategories(data);
        if (data.length > 0) {
          setItems((current) =>
            current.map((item) => ({ ...item, categoryId: item.categoryId ?? data[0].id })),
          );
        }
      } catch {
        setCategories([]);
      }
    };
    void loadCategories();
  }, []);

  const addItem = () => setItems((prev) => [
    ...prev,
    { categoryId: categories[0]?.id ?? null, partNumber: '', partDescription: '', quantity: 1 },
  ]);

  const removeItem = (index: number) => setItems((prev) => prev.filter((_, itemIndex) => itemIndex !== index));

  const updateItem = (index: number, field: keyof CartItem, value: string | number | null) => {
    setItems((prev) =>
      prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)),
    );
  };

  const submit = async () => {
    if (items.some((item) => !item.categoryId || !item.partNumber || item.quantity < 1)) {
      setError('Please fill all required item fields.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await createOrder({
        urgency,
        items: items.map((item) => ({
          categoryId: item.categoryId as number,
          partNumber: item.partNumber,
          partDescription: item.partDescription || undefined,
          quantity: item.quantity,
        })),
      });
      navigate('/buyer/orders');
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold">Place Order</h1>

      {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}

      <div className="surface-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold">Order Items</h2>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={`${index}-${item.partNumber}`} className="grid grid-cols-12 items-end gap-3">
              <div className="col-span-3">
                <label className="mb-1 block text-xs text-gray-400">Category</label>
                <select
                  value={item.categoryId ?? ''}
                  onChange={(event) => updateItem(index, 'categoryId', Number(event.target.value))}
                  className="w-full rounded px-3 py-2 text-sm"
                >
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}{category.subcategory ? ` - ${category.subcategory}` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs text-gray-400">Part Number</label>
                <input
                  value={item.partNumber}
                  onChange={(event) => updateItem(index, 'partNumber', event.target.value)}
                  className="w-full rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-3">
                <label className="mb-1 block text-xs text-gray-400">Description</label>
                <input
                  value={item.partDescription}
                  onChange={(event) => updateItem(index, 'partDescription', event.target.value)}
                  className="w-full rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-xs text-gray-400">Qty</label>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(event) => updateItem(index, 'quantity', parseInt(event.target.value, 10) || 1)}
                  className="w-full rounded px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-1">
                {items.length > 1 ? (
                  <button onClick={() => removeItem(index)} className="w-full rounded bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200">
                    X
                  </button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 text-sm text-blue-600 hover:underline">+ Add Item</button>
      </div>

      <div className="surface-card rounded-2xl p-6">
        <h2 className="mb-4 text-lg font-semibold">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-gray-400">Urgency</label>
            <select value={urgency} onChange={(event) => setUrgency(event.target.value as 'standard' | 'urgent' | 'critical')} className="w-full rounded px-3 py-2 text-sm">
              <option value="standard">Standard</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>
        </div>
      </div>

      <button
        className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        onClick={() => void submit()}
        disabled={submitting}
      >
        {submitting ? 'Placing Order...' : `Place Order (${items.length} item${items.length > 1 ? 's' : ''})`}
      </button>
    </div>
  );
}
