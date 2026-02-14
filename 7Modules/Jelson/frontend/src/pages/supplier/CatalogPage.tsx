import { FormEvent, useEffect, useState } from "react";
import api from "../../api/client";
import type { CatalogItem, Category } from "../../types";

const SupplierCatalogPage = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    category_id: 0,
    part_name: "",
    part_number: "",
    brand: "",
    unit_price: 0,
    quantity_in_stock: 0,
    min_order_quantity: 1,
    lead_time_hours: 24,
  });

  const loadData = async () => {
    const [categoriesRes, catalogRes] = await Promise.all([
      api.get<Category[]>("/suppliers/categories"),
      api.get<CatalogItem[]>("/suppliers/catalog"),
    ]);
    setCategories(categoriesRes.data);
    setCatalogItems(catalogRes.data);
    if (categoriesRes.data.length > 0 && !form.category_id) {
      setForm((prev) => ({ ...prev, category_id: categoriesRes.data[0].id }));
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await api.post("/suppliers/catalog", {
        ...form,
        brand: form.brand.trim() || null,
      });
      setForm((prev) => ({
        ...prev,
        part_name: "",
        part_number: "",
        brand: "",
        unit_price: 0,
        quantity_in_stock: 0,
      }));
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to create catalog item");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <form className="card" onSubmit={handleSubmit} style={{ display: "grid", gap: "0.8rem" }}>
        <h2 style={{ marginTop: 0 }}>Catalog Management</h2>
        <div>
          <label>Category</label>
          <select
            value={form.category_id}
            onChange={(event) => setForm((prev) => ({ ...prev, category_id: Number(event.target.value) }))}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name} {category.subcategory ? `- ${category.subcategory}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Part name</label>
          <input
            value={form.part_name}
            onChange={(event) => setForm((prev) => ({ ...prev, part_name: event.target.value }))}
            required
          />
        </div>
        <div>
          <label>Part number</label>
          <input
            value={form.part_number}
            onChange={(event) => setForm((prev) => ({ ...prev, part_number: event.target.value }))}
            required
          />
        </div>
        <div>
          <label>Brand</label>
          <input
            value={form.brand}
            onChange={(event) => setForm((prev) => ({ ...prev, brand: event.target.value }))}
          />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.5rem" }}>
          <div>
            <label>Unit price</label>
            <input
              type="number"
              min={0.01}
              step="0.01"
              value={form.unit_price}
              onChange={(event) => setForm((prev) => ({ ...prev, unit_price: Number(event.target.value) }))}
              required
            />
          </div>
          <div>
            <label>Stock</label>
            <input
              type="number"
              min={0}
              value={form.quantity_in_stock}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, quantity_in_stock: Number(event.target.value) }))
              }
              required
            />
          </div>
          <div>
            <label>Min order</label>
            <input
              type="number"
              min={1}
              value={form.min_order_quantity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, min_order_quantity: Number(event.target.value) }))
              }
              required
            />
          </div>
          <div>
            <label>Lead time (h)</label>
            <input
              type="number"
              min={1}
              value={form.lead_time_hours}
              onChange={(event) => setForm((prev) => ({ ...prev, lead_time_hours: Number(event.target.value) }))}
              required
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit">Add Item</button>
          <button type="button" className="secondary" onClick={() => void loadData()}>
            Refresh
          </button>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Current Catalog</h3>
        {catalogItems.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No items added yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Part</th>
                <th>Part number</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Lead time</th>
              </tr>
            </thead>
            <tbody>
              {catalogItems.map((item) => (
                <tr key={item.id}>
                  <td>{item.part_name}</td>
                  <td>{item.part_number}</td>
                  <td>{item.unit_price}</td>
                  <td>{item.quantity_in_stock}</td>
                  <td>{item.lead_time_hours}h</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SupplierCatalogPage;
