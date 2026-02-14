import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import api from "../../api/client";
import type { CatalogItem, SupplierPerformancePoint, SuppliersAnalyticsResponse } from "../../types";

const SupplierDetailPage = () => {
  const { supplierId } = useParams();
  const parsedSupplierId = Number(supplierId);

  const [supplier, setSupplier] = useState<SupplierPerformancePoint | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalStock = useMemo(
    () => catalog.reduce((acc, item) => acc + Number(item.quantity_in_stock || 0), 0),
    [catalog],
  );

  useEffect(() => {
    if (!Number.isFinite(parsedSupplierId) || parsedSupplierId <= 0) {
      return;
    }

    const loadSupplierDetail = async () => {
      setLoading(true);
      setError(null);
      try {
        const suppliersRes = await api.get<SuppliersAnalyticsResponse>("/analytics/suppliers");
        const foundSupplier =
          suppliersRes.data.suppliers.find((item) => item.supplier_id === parsedSupplierId) ?? null;
        setSupplier(foundSupplier);

        const catalogRes = await api.get<CatalogItem[]>("/suppliers/catalog", {
          params: { supplier_id: parsedSupplierId },
        });
        setCatalog(catalogRes.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail ?? "Failed to load supplier details");
      } finally {
        setLoading(false);
      }
    };

    void loadSupplierDetail();
  }, [parsedSupplierId]);

  if (!Number.isFinite(parsedSupplierId) || parsedSupplierId <= 0) {
    return <Navigate to="/admin/analytics" replace />;
  }

  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
          <div>
            <h2 style={{ marginTop: 0, marginBottom: "0.35rem" }}>
              {supplier?.supplier_name ?? `Supplier #${parsedSupplierId}`}
            </h2>
            <div style={{ color: "var(--muted)" }}>
              Supplier detail page from Module 7 analytics.
            </div>
          </div>
          <Link to="/admin/analytics">
            <button className="secondary">Back to Analytics</button>
          </Link>
        </div>
      </div>

      {error && <div className="card" style={{ color: "var(--danger)" }}>{error}</div>}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Orders Fulfilled</div>
          <h2 style={{ marginBottom: 0 }}>{supplier?.orders_fulfilled ?? "-"}</h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Avg Dispatch Time</div>
          <h2 style={{ marginBottom: 0 }}>
            {supplier?.avg_dispatch_time_seconds != null
              ? `${supplier.avg_dispatch_time_seconds.toFixed(2)} s`
              : "-"}
          </h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Reliability Score</div>
          <h2 style={{ marginBottom: 0 }}>
            {supplier?.reliability_score != null ? supplier.reliability_score.toFixed(3) : "-"}
          </h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Revenue</div>
          <h2 style={{ marginBottom: 0 }}>{supplier?.revenue != null ? supplier.revenue.toFixed(2) : "-"}</h2>
        </div>
        <div className="card">
          <div style={{ color: "var(--muted)" }}>Catalog Stock</div>
          <h2 style={{ marginBottom: 0 }}>{totalStock}</h2>
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginTop: 0 }}>Catalog Items</h3>
        {loading ? (
          <div>Loading supplier details...</div>
        ) : catalog.length === 0 ? (
          <div style={{ color: "var(--muted)" }}>No catalog items found for this supplier.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Part Name</th>
                <th>Part Number</th>
                <th>Brand</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Lead Time (h)</th>
              </tr>
            </thead>
            <tbody>
              {catalog.map((item) => (
                <tr key={item.id}>
                  <td>{item.part_name}</td>
                  <td>{item.part_number}</td>
                  <td>{item.brand ?? "-"}</td>
                  <td>{item.unit_price}</td>
                  <td>{item.quantity_in_stock}</td>
                  <td>{item.lead_time_hours}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default SupplierDetailPage;
