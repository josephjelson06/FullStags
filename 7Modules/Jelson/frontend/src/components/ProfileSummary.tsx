import useAuthStore from "../stores/authStore";

const ProfileSummary = () => {
  const { user } = useAuthStore();

  if (!user) {
    return <div>Loading profile...</div>;
  }

  return (
    <div className="card">
      <h3 style={{ marginTop: 0 }}>Profile snapshot</h3>
      <div style={{ display: "grid", gap: "0.4rem", color: "var(--muted)" }}>
        <div>Email: {user.email}</div>
        <div>Role: {user.role}</div>
        {user.factory_name && <div>Factory: {user.factory_name}</div>}
        {user.business_name && <div>Business: {user.business_name}</div>}
        {user.delivery_address && <div>Address: {user.delivery_address}</div>}
        {user.warehouse_address && <div>Warehouse: {user.warehouse_address}</div>}
        {user.gst_number && <div>GST: {user.gst_number}</div>}
        {(user.latitude || user.longitude) && (
          <div>
            Coordinates: {user.latitude}, {user.longitude}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileSummary;
