import { useState } from 'react';

import { DataTable, type DataColumn } from '@/components/DataTable';
import { ErrorBanner } from '@/components/ErrorBanner';
import { Modal } from '@/components/Modal';
import { PageHeader } from '@/components/PageHeader';
import { useInventory } from '@/hooks/useInventory';
import type { InventoryItem } from '@/types';

export function InventoryManager() {
  const { items, pickTimeMinutes, loading, error, refetch, addItem, editItem, removeItem, savePickTime } = useInventory();

  const [partName, setPartName] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState('100');
  const [pickTimeDraft, setPickTimeDraft] = useState(String(pickTimeMinutes));
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const onAdd = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await addItem({
        partName,
        partNumber,
        quantity: Number(quantity),
        price: Number(price),
      });
      setPartName('');
      setPartNumber('');
      setQuantity('1');
      setPrice('100');
    } finally {
      setSubmitting(false);
    }
  };

  const openEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditQty(String(item.quantity));
    setEditPrice(String(item.price));
  };

  const confirmEdit = async () => {
    if (!editingItem) return;
    await editItem(editingItem.itemId, {
      quantity: Number(editQty),
      price: Number(editPrice),
    });
    setEditingItem(null);
  };

  const columns: DataColumn<InventoryItem>[] = [
    { header: 'Part Name', render: (row) => <span className="font-medium">{row.partName}</span> },
    { header: 'Part Number', render: (row) => <span className="font-mono text-xs text-text-secondary">{row.partNumber}</span> },
    { header: 'Qty', render: (row) => <span className="font-semibold">{row.quantity}</span> },
    { header: 'Price', render: (row) => <span className="font-semibold">${row.price.toFixed(2)}</span> },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all hover:shadow-xs"
            style={{
              background: 'var(--color-surface-inset)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
            }}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => void removeItem(row.itemId)}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all hover:shadow-xs"
            style={{
              background: 'var(--color-danger-bg)',
              color: 'var(--color-danger)',
              border: '1px solid var(--color-danger)',
            }}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <section className="space-y-6">
      <PageHeader
        title="Inventory Manager"
        subtitle="Manage available parts and keep your pick-time SLA sharp for higher ranking."
      />

      {error ? <ErrorBanner message={error} onRetry={() => void refetch()} /> : null}

      {/* Pick Time SLA */}
      <article className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="inv-pick-time">
              Pick Time SLA (minutes)
            </label>
            <input
              id="inv-pick-time"
              className="w-32"
              value={pickTimeDraft}
              onChange={(e) => setPickTimeDraft(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() => void savePickTime(Number(pickTimeDraft))}
            className="rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:shadow-md"
            style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
          >
            Save Pick Time
          </button>
        </div>
        <p className="mt-2 text-xs text-text-muted">Faster pick times = higher ranking in emergency searches.</p>
      </article>

      {/* Add Item Form */}
      <form className="grid gap-3 rounded-2xl border border-border bg-surface p-5 shadow-sm md:grid-cols-5" onSubmit={onAdd}>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted" htmlFor="inv-name">Part Name</label>
          <input id="inv-name" className="w-full" value={partName} onChange={(e) => setPartName(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted" htmlFor="inv-number">Part Number</label>
          <input id="inv-number" className="w-full" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted" htmlFor="inv-qty">Quantity</label>
          <input id="inv-qty" type="number" className="w-full" value={quantity} onChange={(e) => setQuantity(e.target.value)} required />
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-text-muted" htmlFor="inv-price">Price</label>
          <input id="inv-price" type="number" step="0.01" className="w-full" value={price} onChange={(e) => setPrice(e.target.value)} required />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl px-4 py-2 text-sm font-semibold shadow-sm transition-all hover:shadow-md disabled:opacity-70"
            style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
          >
            {submitting ? 'Adding...' : '+ Add Item'}
          </button>
        </div>
      </form>

      <DataTable
        columns={columns}
        data={items}
        rowKey={(row) => row.itemId}
        loading={loading}
        emptyTitle="No inventory yet"
        emptyDescription="Add parts to become discoverable in emergency searches."
      />

      {/* Edit Modal */}
      <Modal isOpen={Boolean(editingItem)} onClose={() => setEditingItem(null)} title={`Edit ${editingItem?.partName ?? ''}`}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="edit-qty">Quantity</label>
            <input id="edit-qty" type="number" className="w-full" value={editQty} onChange={(e) => setEditQty(e.target.value)} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary" htmlFor="edit-price">Price</label>
            <input id="edit-price" type="number" step="0.01" className="w-full" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} />
          </div>
          <button
            type="button"
            onClick={() => void confirmEdit()}
            className="w-full rounded-xl px-4 py-2.5 text-sm font-semibold shadow-sm transition-all hover:shadow-md"
            style={{ background: 'var(--gradient-primary)', color: 'var(--color-text-on-primary)' }}
          >
            Save Changes
          </button>
        </div>
      </Modal>
    </section>
  );
}
