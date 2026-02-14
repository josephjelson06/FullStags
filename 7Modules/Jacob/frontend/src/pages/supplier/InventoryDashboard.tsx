import { useEffect, useMemo, useState } from "react";
import {
  getCurrentSupplier,
  getSupplierSummary,
  listLowStock,
  listOwnCatalog,
  listRecentTransactions,
  updateCatalogEntry,
} from "../../api/inventory";
import { CatalogEntry, InventoryTransaction, SupplierSummary } from "../../types/inventory";

export default function InventoryDashboard() {
  const [catalog, setCatalog] = useState<CatalogEntry[]>([]);
  const [lowStock, setLowStock] = useState<CatalogEntry[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [summary, setSummary] = useState<SupplierSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const supplier = await getCurrentSupplier();
      const [catalogRes, lowStockRes, txRes, summaryRes] = await Promise.all([
        listOwnCatalog(1, 500),
        listLowStock(),
        listRecentTransactions(20),
        getSupplierSummary(supplier.id),
      ]);
      setCatalog(catalogRes.items);
      setLowStock(lowStockRes);
      setTransactions(txRes);
      setSummary(summaryRes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const calculated = useMemo(() => {
    const totalStockValue = catalog.reduce(
      (sum, entry) => sum + entry.unit_price * entry.quantity_in_stock,
      0
    );
    const avgLeadTime =
      catalog.length > 0
        ? catalog.reduce((sum, entry) => sum + entry.lead_time_hours, 0) / catalog.length
        : 0;
    return {
      totalParts: catalog.length,
      totalStockValue,
      avgLeadTime,
    };
  }, [catalog]);

  const restock = async (entry: CatalogEntry) => {
    const input = window.prompt(
      `Enter additional quantity to add for ${entry.part_name}:`,
      "10"
    );
    if (!input) return;
    const addQty = Number(input);
    if (!Number.isFinite(addQty) || addQty <= 0) {
      window.alert("Please enter a positive number.");
      return;
    }

    try {
      await updateCatalogEntry(entry.id, {
        quantity_in_stock: entry.quantity_in_stock + Math.floor(addQty),
      });
      await loadDashboard();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restock failed");
    }
  };

  return (
    <section className="grid" style={{ gap: "1rem" }}>
      <div className="card">
        <h1 style={{ marginTop: 0 }}>Inventory Dashboard</h1>
        <p style={{ color: "var(--muted)", marginBottom: 0 }}>
          Operational overview for stock value, lead times, and movement history.
        </p>
      </div>

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
        <>
          <div className="grid grid-4">
            <div className="card">
              <div style={{ color: "var(--muted)" }}>Total Parts Listed</div>
              <h2>{summary?.total_parts ?? calculated.totalParts}</h2>
            </div>
            <div className="card">
              <div style={{ color: "var(--muted)" }}>Total Stock Value</div>
              <h2>Rs {(summary?.total_stock_value ?? calculated.totalStockValue).toLocaleString()}</h2>
            </div>
            <div className="card">
              <div style={{ color: "var(--muted)" }}>Low Stock Items</div>
              <h2>{lowStock.length}</h2>
            </div>
            <div className="card">
              <div style={{ color: "var(--muted)" }}>Avg Lead Time</div>
              <h2>
                {Math.round(summary?.avg_lead_time_hours ?? calculated.avgLeadTime)} hrs
              </h2>
            </div>
          </div>

          <div className="card" style={{ overflowX: "auto" }}>
            <h2 style={{ marginTop: 0 }}>Low Stock Alerts</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Part Name</th>
                  <th>Part #</th>
                  <th>Stock</th>
                  <th>Min Order Qty</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.part_name}</td>
                    <td>{entry.part_number}</td>
                    <td>
                      <span className="tag red">{entry.quantity_in_stock}</span>
                    </td>
                    <td>{entry.min_order_quantity}</td>
                    <td>
                      <button className="button secondary" onClick={() => restock(entry)}>
                        Restock
                      </button>
                    </td>
                  </tr>
                ))}
                {lowStock.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--muted)" }}>
                      No low-stock items.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="card" style={{ overflowX: "auto" }}>
            <h2 style={{ marginTop: 0 }}>Recent Inventory Transactions</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>Catalog ID</th>
                  <th>Change Amount</th>
                  <th>Reason</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx, index) => (
                  <tr key={`${tx.catalog_id}-${tx.created_at ?? index}-${tx.change_amount}`}>
                    <td>{tx.catalog_id}</td>
                    <td style={{ color: tx.change_amount < 0 ? "#8b1b1b" : "#1d6f2a" }}>
                      {tx.change_amount > 0 ? `+${tx.change_amount}` : tx.change_amount}
                    </td>
                    <td>{tx.reason}</td>
                    <td>{tx.created_at ?? "-"}</td>
                  </tr>
                ))}
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: "center", color: "var(--muted)" }}>
                      No recent transactions.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
