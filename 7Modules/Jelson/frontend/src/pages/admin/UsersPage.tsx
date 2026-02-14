import { useEffect, useState } from "react";
import api from "../../api/client";
import type { UserListItem, UserProfile } from "../../types";

const UsersPage = () => {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roleFilter, setRoleFilter] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get<UserListItem[]>("/users", {
        params: roleFilter ? { role: roleFilter } : {},
      });
      setUsers(response.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const toggleActive = async (user: UserListItem) => {
    const response = await api.patch<UserListItem>(`/users/${user.id}/activate`, {
      is_active: !user.is_active,
    });
    setUsers((prev) =>
      prev.map((item) => (item.id === user.id ? response.data : item))
    );
  };

  const viewProfile = async (userId: number) => {
    const response = await api.get<UserProfile>(`/users/${userId}/profile`);
    setSelectedProfile(response.data);
  };

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0 }}>Users</h2>
        <select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value)}>
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="supplier">Supplier</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? (
        <div>Loading users...</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{user.is_active ? "Active" : "Inactive"}</td>
                <td style={{ display: "flex", gap: "0.5rem" }}>
                  <button className="secondary" onClick={() => viewProfile(user.id)}>
                    View profile
                  </button>
                  <button onClick={() => toggleActive(user)}>
                    {user.is_active ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedProfile && (
        <div style={{ marginTop: "2rem" }}>
          <h3>Profile details</h3>
          <div style={{ display: "grid", gap: "0.5rem", color: "var(--muted)" }}>
            <div>Email: {selectedProfile.email}</div>
            <div>Role: {selectedProfile.role}</div>
            {selectedProfile.factory_name && (
              <div>Factory: {selectedProfile.factory_name}</div>
            )}
            {selectedProfile.business_name && (
              <div>Business: {selectedProfile.business_name}</div>
            )}
            {selectedProfile.delivery_address && (
              <div>Address: {selectedProfile.delivery_address}</div>
            )}
            {selectedProfile.warehouse_address && (
              <div>Warehouse: {selectedProfile.warehouse_address}</div>
            )}
            {selectedProfile.gst_number && (
              <div>GST: {selectedProfile.gst_number}</div>
            )}
            {(selectedProfile.latitude || selectedProfile.longitude) && (
              <div>
                Coordinates: {selectedProfile.latitude}, {selectedProfile.longitude}
              </div>
            )}
          </div>
          <div style={{ marginTop: "1rem" }}>
            <button className="secondary" onClick={() => setSelectedProfile(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
