import ProfileSummary from "../../components/ProfileSummary";

const BuyerDashboard = () => {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Buyer dashboard</h2>
        <p style={{ color: "var(--muted)" }}>
          Track your procurement activity, manage delivery locations, and place new
          spare parts requests.
        </p>
      </div>
      <ProfileSummary />
    </div>
  );
};

export default BuyerDashboard;
