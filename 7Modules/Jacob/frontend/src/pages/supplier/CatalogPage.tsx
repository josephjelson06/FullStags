import { FormEvent, useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import {
  createCatalogEntry,
  deleteCatalogEntry,
  listCategories,
  listOwnCatalog,
  updateCatalogEntry,
  type CatalogPayload,
} from "../../api/inventory";
import { CatalogEntry, PartCategory } from "../../types/inventory";

type FormState = {
  category_id: string;
  part_name: string;
  part_number: string;
  brand: string;
  unit_price: string;
  quantity_in_stock: string;
  min_order_quantity: string;
  lead_time_hours: string;
};

const emptyForm: FormState = {
  category_id: "",
  part_name: "",
  part_number: "",
  brand: "",
  unit_price: "",
  quantity_in_stock: "",
  min_order_quantity: "1",
  lead_time_hours: "",
};

const toPayload = (form: FormState): CatalogPayload => ({
  category_id: Number(form.category_id),
  part_name: form.part_name.trim(),
  part_number: form.part_number.trim(),
  brand: form.brand.trim(),
  unit_price: Number(form.unit_price),
  quantity_in_stock: Number(form.quantity_in_stock),
  min_order_quantity: Number(form.min_order_quantity),
  lead_time_hours: Number(form.lead_time_hours),
});

const stockTagClass = (stock: number) => {
  if (stock > 20) return "tag green";
  if (stock >= 5) return "tag yellow";
  return "tag red";
};

export default function CatalogPage() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<CatalogEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catalogRes, categoriesRes] = await Promise.all([
        listOwnCatalog(1, 500),
        listCategories(),
      ]);
      setCatalog(catalogRes.items);
      setCategories(categoriesRes);
      if (!form.category_id && categoriesRes.length > 0) {
        setForm((prev) => ({ ...prev, category_id: String(categoriesRes[0].id) }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter((entry) =>
      [entry.part_name, entry.part_number, entry.brand ?? "", entry.category_name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [catalog, query]);

  const openAddModal = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      category_id:
        categories.length > 0 ? String(categories[0].id) : emptyForm.category_id,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (entry: CatalogEntry) => {
    setEditing(entry);
    setForm({
      category_id: String(entry.category_id),
      part_name: entry.part_name,
      part_number: entry.part_number,
      brand: entry.brand ?? "",
      unit_price: String(entry.unit_price),
      quantity_in_stock: String(entry.quantity_in_stock),
      min_order_quantity: String(entry.min_order_quantity),
      lead_time_hours: String(entry.lead_time_hours),
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) {
      setIsModalOpen(false);
      setEditing(null);
    }
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = toPayload(form);
      if (editing) {
        await updateCatalogEntry(editing.id, payload);
      } else {
        await createCatalogEntry(payload);
      }
      setIsModalOpen(false);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (entry: CatalogEntry) => {
    const confirmed = window.confirm(
      `Delete ${entry.part_name} (${entry.part_number}) from catalog?`
    );
    if (!confirmed) return;
    setError(null);
    try {
      await deleteCatalogEntry(entry.id);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete entry");
    }
  };

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Catalog Management</h1>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>
            Maintain supplier parts catalog with stock visibility.
          </p>
        </div>
        <button className="button" onClick={openAddModal}>
          Add Part
        </button>
      </div>

      <div className="card" style={{ display: "flex", gap: "0.8rem", alignItems: "center" }}>
        <input
          className="input"
          placeholder="Filter by part name, part number, category, brand"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>
          {error}
        </div>
      ) : null}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
            <div className="spinner" aria-label="Loading" />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Part Name</th>
                <th>Part #</th>
                <th>Category</th>
                <th>Brand</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Lead Time</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCatalog.map((entry) => (
                <tr key={entry.id}>
                  <td>{entry.part_name}</td>
                  <td>{entry.part_number}</td>
                  <td>{entry.category_name ?? "-"}</td>
                  <td>{entry.brand ?? "-"}</td>
                  <td>Rs {entry.unit_price.toLocaleString()}</td>
                  <td>
                    <span className={stockTagClass(entry.quantity_in_stock)}>
                      {entry.quantity_in_stock}
                    </span>
                  </td>
                  <td>{entry.lead_time_hours} hrs</td>
                  <td style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    <button className="button secondary" onClick={() => openEditModal(entry)}>
                      Edit
                    </button>
                    <button className="button ghost" onClick={() => handleDelete(entry)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCatalog.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>
                    No catalog entries found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>

      {isModalOpen ? (
        <Modal title={editing ? "Edit Part" : "Add Part"} onClose={closeModal}>
          <form onSubmit={handleSubmit} className="grid" style={{ gap: "0.9rem" }}>
            <div className="form-grid">
              <label>
                Category
                <select
                  className="input"
                  value={form.category_id}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, category_id: event.target.value }))
                  }
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Part Name
                <input
                  className="input"
                  value={form.part_name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, part_name: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Part Number
                <input
                  className="input"
                  value={form.part_number}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, part_number: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Brand
                <input
                  className="input"
                  value={form.brand}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, brand: event.target.value }))
                  }
                />
              </label>

              <label>
                Unit Price
                <input
                  className="input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.unit_price}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, unit_price: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Quantity in Stock
                <input
                  className="input"
                  type="number"
                  min={0}
                  value={form.quantity_in_stock}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, quantity_in_stock: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Min Order Quantity
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.min_order_quantity}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, min_order_quantity: event.target.value }))
                  }
                  required
                />
              </label>

              <label>
                Lead Time (hours)
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={form.lead_time_hours}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, lead_time_hours: event.target.value }))
                  }
                  required
                />
              </label>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.8rem" }}>
              <button type="button" className="button ghost" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="button" disabled={saving}>
                {saving ? "Saving..." : editing ? "Save Changes" : "Create Part"}
              </button>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
