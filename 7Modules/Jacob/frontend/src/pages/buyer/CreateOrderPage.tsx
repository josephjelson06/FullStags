import { FormEvent, useEffect, useMemo, useState } from "react";
import { listCategories, searchParts } from "../../api/inventory";
import { createOrder } from "../../api/orders";
import { CatalogEntry, PartCategory } from "../../types/inventory";

type LineItem = {
  id: number;
  categoryId: string;
  partNumber: string;
  description: string;
  quantity: string;
  suggestions: CatalogEntry[];
};

const DEFAULT_LAT = 18.5204;
const DEFAULT_LNG = 73.8567;
const DEFAULT_RADIUS = 1500;

const urgencyTagClass: Record<string, string> = {
  standard: "tag green",
  urgent: "tag yellow",
  critical: "tag red",
};

const defaultDateForUrgency = (urgency: "standard" | "urgent" | "critical") => {
  const now = new Date();
  const offsetDays = urgency === "standard" ? 3 : urgency === "urgent" ? 1 : 0;
  now.setDate(now.getDate() + offsetDays);
  return now.toISOString().slice(0, 10);
};

const makeLine = (id: number): LineItem => ({
  id,
  categoryId: "",
  partNumber: "",
  description: "",
  quantity: "1",
  suggestions: [],
});

const uniquePartSuggestions = (items: CatalogEntry[]) => {
  const seen = new Set<string>();
  const output: CatalogEntry[] = [];
  for (const item of items) {
    const key = item.part_number;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(item);
    }
    if (output.length >= 6) break;
  }
  return output;
};

export default function CreateOrderPage() {
  const [categories, setCategories] = useState<PartCategory[]>([]);
  const [lines, setLines] = useState<LineItem[]>([makeLine(1)]);
  const [urgency, setUrgency] = useState<"standard" | "urgent" | "critical">("standard");
  const [requiredDate, setRequiredDate] = useState(defaultDateForUrgency("standard"));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    listCategories()
      .then((result) => {
        setCategories(result);
        if (result.length > 0) {
          setLines((prev) =>
            prev.map((line) => ({
              ...line,
              categoryId: line.categoryId || String(result[0].id),
            }))
          );
        }
      })
      .catch(() => undefined);
  }, []);

  const totalQuantity = useMemo(
    () => lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0),
    [lines]
  );

  const addLine = () => {
    setLines((prev) => [...prev, makeLine(Date.now())]);
  };

  const removeLine = (id: number) => {
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((line) => line.id !== id)));
  };

  const updateLine = (id: number, patch: Partial<LineItem>) => {
    setLines((prev) => prev.map((line) => (line.id === id ? { ...line, ...patch } : line)));
  };

  const fetchSuggestions = async (id: number, query: string) => {
    if (query.trim().length < 2) {
      updateLine(id, { suggestions: [] });
      return;
    }

    try {
      const matches = await searchParts(
        query,
        DEFAULT_LAT,
        DEFAULT_LNG,
        DEFAULT_RADIUS,
        undefined
      );
      updateLine(id, { suggestions: uniquePartSuggestions(matches) });
    } catch {
      updateLine(id, { suggestions: [] });
    }
  };

  const onUrgencyChange = (next: "standard" | "urgent" | "critical") => {
    setUrgency(next);
    setRequiredDate(defaultDateForUrgency(next));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const payload = {
        urgency,
        required_delivery_date: requiredDate ? `${requiredDate}T09:00:00` : undefined,
        items: lines.map((line) => ({
          category_id: Number(line.categoryId),
          part_number: line.partNumber.trim(),
          part_description: line.description.trim() || undefined,
          quantity: Number(line.quantity),
        })),
      };

      if (payload.items.some((line) => !line.category_id || !line.part_number || line.quantity <= 0)) {
        throw new Error("Each line item needs category, part number, and quantity > 0");
      }

      const order = await createOrder(payload);
      setSuccess(`Order #${order.id} created with ${order.items.length} item(s).`);
      const defaultCategory = categories[0] ? String(categories[0].id) : "";
      setLines([makeLine(Date.now())].map((line) => ({ ...line, categoryId: defaultCategory })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Create Order</h1>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Build a multi-line requisition with urgency and required delivery date.
        </p>
      </div>

      <form className="card grid" style={{ gap: "1rem" }} onSubmit={onSubmit}>
        {lines.map((line, index) => (
          <div key={line.id} className="card" style={{ background: "#fbfbf9" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Line Item {index + 1}</strong>
              <button type="button" className="button ghost" onClick={() => removeLine(line.id)}>
                Remove
              </button>
            </div>

            <div className="form-grid" style={{ marginTop: "0.8rem" }}>
              <label>
                Category
                <select
                  className="input"
                  value={line.categoryId}
                  onChange={(event) => updateLine(line.id, { categoryId: event.target.value })}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ position: "relative" }}>
                Part Number
                <input
                  className="input"
                  value={line.partNumber}
                  onChange={(event) => {
                    const value = event.target.value;
                    updateLine(line.id, { partNumber: value });
                    void fetchSuggestions(line.id, value);
                  }}
                  placeholder="e.g. 6205 BB"
                  required
                />
                {line.suggestions.length > 0 ? (
                  <div
                    className="card"
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      zIndex: 10,
                      padding: "0.4rem",
                      maxHeight: "180px",
                      overflowY: "auto",
                    }}
                  >
                    {line.suggestions.map((suggestion) => (
                      <button
                        key={`${line.id}-${suggestion.id}`}
                        type="button"
                        className="button ghost"
                        style={{ width: "100%", justifyContent: "space-between", marginBottom: "0.3rem" }}
                        onClick={() =>
                          updateLine(line.id, {
                            partNumber: suggestion.part_number,
                            description: suggestion.part_name,
                            categoryId: String(suggestion.category_id),
                            suggestions: [],
                          })
                        }
                      >
                        <span>{suggestion.part_number}</span>
                        <span>{suggestion.part_name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </label>

              <label>
                Quantity
                <input
                  className="input"
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(event) => updateLine(line.id, { quantity: event.target.value })}
                  required
                />
              </label>

              <label>
                Description
                <input
                  className="input"
                  value={line.description}
                  onChange={(event) => updateLine(line.id, { description: event.target.value })}
                  placeholder="Optional usage note"
                />
              </label>
            </div>
          </div>
        ))}

        <div>
          <button type="button" className="button secondary" onClick={addLine}>
            Add Item
          </button>
        </div>

        <div className="form-grid">
          <label>
            Urgency
            <select
              className="input"
              value={urgency}
              onChange={(event) => onUrgencyChange(event.target.value as "standard" | "urgent" | "critical")}
            >
              <option value="standard">Standard</option>
              <option value="urgent">Urgent</option>
              <option value="critical">Critical</option>
            </select>
            <div style={{ marginTop: "0.4rem" }}>
              <span className={urgencyTagClass[urgency]}>{urgency.toUpperCase()}</span>
            </div>
          </label>

          <label>
            Required Delivery Date
            <input
              className="input"
              type="date"
              value={requiredDate}
              onChange={(event) => setRequiredDate(event.target.value)}
            />
          </label>
        </div>

        <div className="card" style={{ background: "#f7fbff" }}>
          <h3 style={{ marginTop: 0 }}>Order Summary</h3>
          <div>Total line items: {lines.length}</div>
          <div>Total quantity: {totalQuantity}</div>
          <div>Urgency: {urgency}</div>
          <div>Required date: {requiredDate || "Not set"}</div>
        </div>

        {error ? (
          <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="card" style={{ borderColor: "#87c69a", color: "#1d6f2a" }}>
            {success}
          </div>
        ) : null}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="submit" className="button" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Order"}
          </button>
        </div>
      </form>
    </section>
  );
}
