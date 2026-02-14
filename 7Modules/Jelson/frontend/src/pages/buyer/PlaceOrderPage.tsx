import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import type { Category, Order } from "../../types";

interface DraftOrderItem {
  category_id: number;
  part_number: string;
  part_description: string;
  quantity: number;
}

const emptyItem = (): DraftOrderItem => ({
  category_id: 0,
  part_number: "",
  part_description: "",
  quantity: 1,
});

const PlaceOrderPage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [urgency, setUrgency] = useState("standard");
  const [items, setItems] = useState<DraftOrderItem[]>([emptyItem()]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  useEffect(() => {
    const loadCategories = async () => {
      const response = await api.get<Category[]>("/suppliers/categories");
      setCategories(response.data);
      if (response.data.length > 0) {
        setItems((prev) =>
          prev.map((item) => ({ ...item, category_id: item.category_id || response.data[0].id })),
        );
      }
    };
    void loadCategories();
  }, []);

  const updateItem = (index: number, patch: Partial<DraftOrderItem>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const addItem = () => {
    const firstCategory = categories[0]?.id ?? 0;
    setItems((prev) => [...prev, { ...emptyItem(), category_id: firstCategory }]);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const validItems = items.filter(
        (item) => item.category_id > 0 && item.part_number.trim() !== "" && item.quantity > 0,
      );
      if (validItems.length === 0) {
        setError("Add at least one valid order item.");
        setSubmitting(false);
        return;
      }

      const response = await api.post<Order>("/orders/", {
        urgency,
        items: validItems.map((item) => ({
          category_id: item.category_id,
          part_number: item.part_number.trim(),
          part_description: item.part_description.trim() || null,
          quantity: item.quantity,
        })),
      });
      setCreatedOrder(response.data);
      setItems([emptyItem()]);
      if (categories.length > 0) {
        setItems([{ ...emptyItem(), category_id: categories[0].id }]);
      }
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Place Order</h2>
        <p style={{ color: "var(--muted)" }}>
          Create a multi-item order. Matching and supplier notification will trigger automatically.
        </p>
      </div>

      <form className="card" onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
        <div>
          <label>Urgency</label>
          <select value={urgency} onChange={(event) => setUrgency(event.target.value)}>
            <option value="standard">Standard</option>
            <option value="urgent">Urgent</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        {items.map((item, index) => (
          <div
            key={index}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "12px",
              padding: "0.9rem",
              display: "grid",
              gap: "0.75rem",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Item {index + 1}</strong>
              {items.length > 1 && (
                <button type="button" className="secondary" onClick={() => removeItem(index)}>
                  Remove
                </button>
              )}
            </div>
            <div>
              <label>Category</label>
              <select
                value={item.category_id}
                onChange={(event) => updateItem(index, { category_id: Number(event.target.value) })}
              >
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name} {category.subcategory ? `- ${category.subcategory}` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label>Part number</label>
              <input
                value={item.part_number}
                onChange={(event) => updateItem(index, { part_number: event.target.value })}
                required
              />
            </div>
            <div>
              <label>Description</label>
              <input
                value={item.part_description}
                onChange={(event) => updateItem(index, { part_description: event.target.value })}
              />
            </div>
            <div>
              <label>Quantity</label>
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })}
                required
              />
            </div>
          </div>
        ))}

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="button" className="secondary" onClick={addItem}>
            Add Item
          </button>
          <button type="submit" disabled={submitting}>
            {submitting ? "Placing..." : "Place Order"}
          </button>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
      </form>

      {createdOrder && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>Order Created</h3>
          <p style={{ color: "var(--muted)" }}>
            Order #{createdOrder.id} created with status {createdOrder.status}.
          </p>
          <button onClick={() => navigate(`/orders/${createdOrder.id}`)}>Track Order</button>
        </div>
      )}
    </div>
  );
};

export default PlaceOrderPage;
