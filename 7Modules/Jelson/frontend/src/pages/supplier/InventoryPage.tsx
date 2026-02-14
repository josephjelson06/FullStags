import { FormEvent, useEffect, useState } from "react";
import api from "../../api/client";
import type { CatalogItem, InventoryTransaction } from "../../types";

const InventoryPage = () => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [catalogId, setCatalogId] = useState<number>(0);
  const [changeAmount, setChangeAmount] = useState<number>(0);
  const [reason, setReason] = useState("manual_adjustment");
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    const [catalogRes, txRes] = await Promise.all([
      api.get<CatalogItem[]>("/suppliers/catalog"),
      api.get<InventoryTransaction[]>("/inventory/transactions"),
    ]);
    setCatalog(catalogRes.data);
    setTransactions(txRes.data);
    if (catalogRes.data.length > 0 && !catalogId) {
      setCatalogId(catalogRes.data[0].id);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleAdjust = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await api.post("/inventory/adjust", {
        catalog_id: catalogId,
        change_amount: changeAmount,
        reason,
      });
      setChangeAmount(0);
      await loadData();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Failed to adjust inventory");
    }
  };

  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Inventory</h2>
        <p style={{ color: "var(--muted)" }}>
          Stock adjustments will create transactions and trigger low-stock alerts automatically.
        </p>
      </div>

      <form className="card" onSubmit={handleAdjust} style={{ display: "grid", gap: "0.8rem" }}>
        <h3 style={{ marginTop: 0 }}>Adjust Stock</h3>
        <div>
          <label>Catalog item</label>
          <select value={catalogId} onChange={(event) => setCatalogId(Number(event.target.value))}>
            {catalog.map((item) => (
              <option key={item.id} value={item.id}>
                {item.part_name} ({item.part_number}) - Stock {item.quantity_in_stock}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Change amount</label>
          <input
            type="number"
            value={changeAmount}
            onChange={(event) => setChangeAmount(Number(event.target.value))}
            required
          />
        </div>
        <div>
          <label>Reason</label>
          <select value={reason} onChange={(event) => setReason(event.target.value)}>
            <option value="restock">restock</option>
            <option value="order_confirmed">order_confirmed</option>
            <option value="manual_adjustment">manual_adjustment</option>
            <option value="csv_upload">csv_upload</option>
          </select>
        </div>
        <div style={{ display: "flex", gap: "0.6rem" }}>
          <button type="submit">Apply</button>
          <button type="button" className="secondary" onClick={() => void loadData()}>
            Refresh
          </button>
        </div>
        {error && <div style={{ color: "var(--danger)" }}>{error}</div>}
      </form>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Recent Inventory Transactions</h3>
        {transactions.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No transactions yet.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Catalog</th>
                <th>Change</th>
                <th>Reason</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr key={tx.id}>
                  <td>#{tx.id}</td>
                  <td>{tx.catalog_id}</td>
                  <td>{tx.change_amount}</td>
                  <td>{tx.reason}</td>
                  <td>{new Date(tx.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default InventoryPage;
