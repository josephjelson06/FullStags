import { useState } from 'react';
import { createOrder } from '@/services/api/orders';
import { useNavigate } from 'react-router-dom';

interface CartItem { part_number: string; part_name: string; quantity: number; }

export function CartCheckout() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CartItem[]>([{ part_number: '', part_name: '', quantity: 1 }]);
  const [urgency, setUrgency] = useState('standard');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => setItems(prev => [...prev, { part_number: '', part_name: '', quantity: 1 }]);
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof CartItem, value: string | number) =>
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item));

  const submit = async () => {
    if (items.some(i => !i.part_number || !i.part_name || i.quantity < 1)) {
      setError('Please fill in all item fields.'); return;
    }
    setSubmitting(true); setError(null);
    try {
      await createOrder({ items, urgency, delivery_address: deliveryAddress } as never);
      navigate('/buyer/orders');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to place order.');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Place Order</h1>

      {error && <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>}

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-4">Order Items</h2>
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={i} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Part Number</label>
                <input value={item.part_number} onChange={e => updateItem(i, 'part_number', e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div className="col-span-4">
                <label className="block text-xs text-gray-500 mb-1">Part Name</label>
                <input value={item.part_name} onChange={e => updateItem(i, 'part_name', e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-gray-500 mb-1">Qty</label>
                <input type="number" min="1" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
              </div>
              <div className="col-span-2">
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200 w-full">Remove</button>
                )}
              </div>
            </div>
          ))}
        </div>
        <button onClick={addItem} className="mt-3 text-sm text-blue-600 hover:underline">+ Add Item</button>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold mb-4">Order Details</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Urgency</label>
            <select value={urgency} onChange={e => setUrgency(e.target.value)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800">
              <option value="standard">Standard</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Delivery Address</label>
            <input value={deliveryAddress} onChange={e => setDeliveryAddress(e.target.value)} placeholder="Optional" className="w-full rounded border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-800" />
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
