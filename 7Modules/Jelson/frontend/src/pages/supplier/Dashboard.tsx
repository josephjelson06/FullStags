import ProfileSummary from "../../components/ProfileSummary";

const SupplierDashboard = () => {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Supplier dashboard</h2>
        <p style={{ color: "var(--muted)" }}>
          Monitor supplier performance, update catalog data, and keep inventory levels aligned.
        </p>
      </div>
      <ProfileSummary />
    </div>
  );
};

export default SupplierDashboard;
