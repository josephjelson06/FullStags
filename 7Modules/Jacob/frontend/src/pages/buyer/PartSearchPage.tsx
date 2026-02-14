import { FormEvent, useEffect, useMemo, useState } from "react";
import { listCategories, searchParts } from "../../api/inventory";
import { addToCart, loadCart } from "../../stores/cartStore";
import { CatalogEntry, CartItem, PartCategory } from "../../types/inventory";

const stockStatus = (entry: CatalogEntry) => {
  if (entry.quantity_in_stock <= 0) return { label: "Out of Stock", className: "tag red" };
  if (entry.quantity_in_stock < entry.min_order_quantity * 2) {
    return { label: "Low Stock", className: "tag yellow" };
  }
  return { label: "In Stock", className: "tag green" };
};

export default function PartSearchPage() {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [lat, setLat] = useState("18.5204");
  const [lng, setLng] = useState("73.8567");
  const [radius, setRadius] = useState("250");
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [results, setResults] = useState<CatalogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    listCategories()
      .then(setCategories)
      .catch(() => undefined);
    setCartItems(loadCart());
  }, []);

  const onSearch = async (event?: FormEvent) => {
    event?.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await searchParts(
        query,
        Number(lat),
        Number(lng),
        Number(radius),
        categoryId ? Number(categoryId) : undefined
      );
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    onSearch();
  }, []);

  const cartCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems]
  );

  const addItem = (entry: CatalogEntry) => {
    addToCart({
      catalog_id: entry.id,
      part_name: entry.part_name,
      part_number: entry.part_number,
      supplier_name: entry.supplier_business_name ?? "Unknown Supplier",
      unit_price: entry.unit_price,
      quantity: 1,
    });
    setCartItems(loadCart());
  };

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h1 style={{ marginTop: 0 }}>Part Search</h1>
          <p style={{ marginBottom: 0, color: "var(--muted)" }}>
            Search by part number or name across suppliers within a service radius.
          </p>
        </div>
        <div className="tag green">Cart Items: {cartCount}</div>
      </div>

      <form className="card form-grid" onSubmit={onSearch}>
        <label>
          Part Query
          <input
            className="input"
            placeholder="Try 6205, ABB-M2AA-090, pump"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label>
          Category
          <select
            className="input"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Latitude
          <input
            className="input"
            type="number"
            step="0.0001"
            value={lat}
            onChange={(event) => setLat(event.target.value)}
            required
          />
        </label>

        <label>
          Longitude
          <input
            className="input"
            type="number"
            step="0.0001"
            value={lng}
            onChange={(event) => setLng(event.target.value)}
            required
          />
        </label>

        <label>
          Radius (km)
          <input
            className="input"
            type="number"
            min={1}
            value={radius}
            onChange={(event) => setRadius(event.target.value)}
            required
          />
        </label>

        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button className="button" type="submit" disabled={loading}>
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
      </form>

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="card" style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
          <div className="spinner" />
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {results.map((entry) => {
            const status = stockStatus(entry);
            return (
              <article key={entry.id} className="card" style={{ display: "grid", gap: "0.5rem" }}>
                <h3 style={{ margin: 0 }}>{entry.part_name}</h3>
                <div style={{ color: "var(--muted)", fontSize: "0.9rem" }}>{entry.part_number}</div>
                <div>
                  <strong>Supplier:</strong> {entry.supplier_business_name}
                </div>
                <div>
                  <strong>Price:</strong> Rs {entry.unit_price.toLocaleString()}
                </div>
                <div>
                  <strong>Lead Time:</strong> {entry.lead_time_hours} hrs
                </div>
                <div>
                  <strong>Distance:</strong> {entry.distance_km?.toFixed(2) ?? "-"} km
                </div>
                <div>
                  <span className={status.className}>{status.label}</span>
                </div>
                <button className="button" onClick={() => addItem(entry)} disabled={entry.quantity_in_stock <= 0}>
                  Add to Order
                </button>
              </article>
            );
          })}

          {results.length === 0 ? (
            <div className="card" style={{ color: "var(--muted)" }}>
              No matching parts found for the selected filters.
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
