import LiveActivityFeed from "../../components/LiveActivityFeed";
import ProfileSummary from "../../components/ProfileSummary";

const AdminDashboard = () => {
  return (
    <div style={{ display: "grid", gap: "1.5rem" }}>
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Admin dashboard</h2>
        <p style={{ color: "var(--muted)" }}>
          Manage platform access, monitor activity, and ensure data quality across modules.
        </p>
      </div>
      <LiveActivityFeed />
      <ProfileSummary />
    </div>
  );
};

export default AdminDashboard;
