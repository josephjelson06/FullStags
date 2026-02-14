import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listOrders, OrdersQuery } from "../../api/orders";
import { OrderRecord } from "../../types/order";

const statusOptions = [
  "",
  "PLACED",
  "MATCHED",
  "CONFIRMED",
  "DISPATCHED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
];

const urgencyOptions = ["", "standard", "urgent", "critical"];

const badgeClass = (status: string) => {
  if (status === "DELIVERED") return "tag green";
  if (status === "CANCELLED") return "tag red";
  return "tag yellow";
};

const getSuppliersForOrder = (order: OrderRecord) => {
  const map = new Map<number, string>();
  order.items.forEach((item) => {
    item.assignments.forEach((assignment) => {
      if (!map.has(assignment.supplier_id)) {
        map.set(assignment.supplier_id, assignment.supplier_business_name ?? `Supplier ${assignment.supplier_id}`);
      }
    });
  });
  return [...map.entries()].map(([id, name]) => ({ id, name }));
};

export default function AllOrdersPage() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [lookupOrders, setLookupOrders] = useState<OrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    status: "",
    urgency: "",
    buyerId: "",
    supplierId: "",
    startDate: "",
    endDate: "",
  });
  const navigate = useNavigate();

  const loadLookup = async () => {
    const response = await listOrders({ page: 1, pageSize: 300 });
    setLookupOrders(response.items);
  };

  const loadOrders = async (override?: Partial<typeof filters>) => {
    setLoading(true);
    setError(null);
    const next = { ...filters, ...(override ?? {}) };

    const query: OrdersQuery = {
      page: 1,
      pageSize: 300,
      status: next.status || undefined,
      urgency: next.urgency || undefined,
      buyerId: next.buyerId ? Number(next.buyerId) : undefined,
      supplierId: next.supplierId ? Number(next.supplierId) : undefined,
      startDate: next.startDate || undefined,
      endDate: next.endDate || undefined,
    };

    try {
      const response = await listOrders(query);
      setOrders(response.items);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void Promise.all([loadLookup(), loadOrders()]);
  }, []);

  const buyerOptions = useMemo(() => {
    const map = new Map<number, string>();
    lookupOrders.forEach((order) => {
      map.set(order.buyer_id, order.buyer_factory_name ?? `Buyer ${order.buyer_id}`);
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [lookupOrders]);

  const supplierOptions = useMemo(() => {
    const map = new Map<number, string>();
    lookupOrders.forEach((order) => {
      getSuppliersForOrder(order).forEach((supplier) => map.set(supplier.id, supplier.name));
    });
    return [...map.entries()].map(([id, name]) => ({ id, name }));
  }, [lookupOrders]);

  const exportCsv = () => {
    const headers = [
      "order_id",
      "status",
      "urgency",
      "buyer",
      "total_items",
      "total_value",
      "created_at",
      "suppliers",
    ];

    const rows = orders.map((order) => {
      const suppliers = getSuppliersForOrder(order)
        .map((supplier) => supplier.name)
        .join(" | ");
      return [
        order.id,
        order.status,
        order.urgency,
        order.buyer_factory_name ?? "",
        order.total_items,
        order.total_value,
        order.created_at ?? "",
        suppliers,
      ]
        .map((value) => `"${String(value).replace(/\"/g, '""')}"`)
        .join(",");
    });

    const csv = `${headers.join(",")}\n${rows.join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = "all-orders-export.csv";
    anchor.click();
    URL.revokeObjectURL(href);
  };

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card" style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.8rem" }}>
        <div>
          <h1 style={{ marginTop: 0 }}>All Orders</h1>
          <p style={{ marginBottom: 0, color: "var(--muted)" }}>
            Administrative view across buyer and supplier pipelines.
          </p>
        </div>
        <button className="button" onClick={exportCsv}>Export to CSV</button>
      </div>

      <div className="card form-grid">
        <label>
          Status
          <select
            className="input"
            value={filters.status}
            onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
          >
            {statusOptions.map((value) => (
              <option key={value || "all-status"} value={value}>
                {value || "All"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Urgency
          <select
            className="input"
            value={filters.urgency}
            onChange={(event) => setFilters((prev) => ({ ...prev, urgency: event.target.value }))}
          >
            {urgencyOptions.map((value) => (
              <option key={value || "all-urgency"} value={value}>
                {value || "All"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Buyer
          <select
            className="input"
            value={filters.buyerId}
            onChange={(event) => setFilters((prev) => ({ ...prev, buyerId: event.target.value }))}
          >
            <option value="">All</option>
            {buyerOptions.map((buyer) => (
              <option key={buyer.id} value={buyer.id}>
                {buyer.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Supplier
          <select
            className="input"
            value={filters.supplierId}
            onChange={(event) => setFilters((prev) => ({ ...prev, supplierId: event.target.value }))}
          >
            <option value="">All</option>
            {supplierOptions.map((supplier) => (
              <option key={supplier.id} value={supplier.id}>
                {supplier.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Start Date
          <input
            className="input"
            type="date"
            value={filters.startDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, startDate: event.target.value }))}
          />
        </label>

        <label>
          End Date
          <input
            className="input"
            type="date"
            value={filters.endDate}
            onChange={(event) => setFilters((prev) => ({ ...prev, endDate: event.target.value }))}
          />
        </label>

        <div style={{ display: "flex", alignItems: "flex-end", gap: "0.6rem" }}>
          <button className="button" onClick={() => void loadOrders()}>
            Apply Filters
          </button>
          <button
            className="button ghost"
            onClick={() => {
              const reset = { status: "", urgency: "", buyerId: "", supplierId: "", startDate: "", endDate: "" };
              setFilters(reset);
              void loadOrders(reset);
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {error ? (
        <div className="card" style={{ borderColor: "#e38b8b", color: "#8b1b1b" }}>{error}</div>
      ) : null}

      <div className="card" style={{ overflowX: "auto" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: "1rem" }}>
            <div className="spinner" />
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Status</th>
                <th>Urgency</th>
                <th>Buyer</th>
                <th>Suppliers</th>
                <th>Total Items</th>
                <th>Total Value</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr
                  key={order.id}
                  style={{ cursor: "pointer" }}
                  onClick={() => navigate(`/orders/${order.id}`)}
                >
                  <td>#{order.id}</td>
                  <td>
                    <span className={badgeClass(order.status)}>{order.status}</span>
                  </td>
                  <td>{order.urgency}</td>
                  <td>{order.buyer_factory_name ?? `Buyer ${order.buyer_id}`}</td>
                  <td>{getSuppliersForOrder(order).map((supplier) => supplier.name).join(", ") || "-"}</td>
                  <td>{order.total_items}</td>
                  <td>Rs {order.total_value.toLocaleString()}</td>
                  <td>{order.created_at ?? "-"}</td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: "center", color: "var(--muted)" }}>
                    No orders match current filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
