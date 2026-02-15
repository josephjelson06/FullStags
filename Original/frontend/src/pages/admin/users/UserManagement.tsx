import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';

interface UserListItem {
  id: number;
  email: string;
  role: string;
  is_active: boolean;
}

interface UserProfile {
  email: string;
  role: string;
  factory_name?: string;
  business_name?: string;
  delivery_address?: string;
  warehouse_address?: string;
  gst_number?: string;
  latitude?: number;
  longitude?: number;
}

export function UserManagement() {
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [roleFilter, setRoleFilter] = useState('');
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = roleFilter ? `?role=${roleFilter}` : '';
      const data = await request<UserListItem[]>(`/api/users${query}`);
      setUsers(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const toggleActive = async (user: UserListItem) => {
    const updated = await request<UserListItem>(`/api/users/${user.id}/activate`, {
      method: 'PATCH',
      body: JSON.stringify({ is_active: !user.is_active }),
    });
    setUsers((prev) => prev.map((item) => (item.id === user.id ? updated : item)));
  };

  const viewProfile = async (userId: number) => {
    const profile = await request<UserProfile>(`/api/users/${userId}/profile`);
    setSelectedProfile(profile);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
        <select
          className="rounded-lg border surface-card px-3 py-2 text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="supplier">Supplier</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8 text-gray-400">Loading users...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border ">
          <table className="min-w-full divide-y">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-transparent">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">{user.email}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm capitalize">
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {user.role}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      user.is_active
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm space-x-2">
                    <button
                      className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
                      onClick={() => viewProfile(user.id)}
                    >
                      View
                    </button>
                    <button
                      className={`rounded px-3 py-1 text-sm ${
                        user.is_active
                          ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300'
                          : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300'
                      }`}
                      onClick={() => toggleActive(user)}
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedProfile && (
        <div className="surface-card rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Profile Details</h2>
            <button
              className="rounded bg-gray-100 px-3 py-1 text-sm hover:bg-gray-200"
              onClick={() => setSelectedProfile(null)}
            >
              Close
            </button>
          </div>
          <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-400">
            <div><span className="font-medium text-gray-900 dark:text-gray-200">Email:</span> {selectedProfile.email}</div>
            <div><span className="font-medium text-gray-900 dark:text-gray-200">Role:</span> {selectedProfile.role}</div>
            {selectedProfile.factory_name && <div><span className="font-medium">Factory:</span> {selectedProfile.factory_name}</div>}
            {selectedProfile.business_name && <div><span className="font-medium">Business:</span> {selectedProfile.business_name}</div>}
            {selectedProfile.delivery_address && <div><span className="font-medium">Address:</span> {selectedProfile.delivery_address}</div>}
            {selectedProfile.warehouse_address && <div><span className="font-medium">Warehouse:</span> {selectedProfile.warehouse_address}</div>}
            {selectedProfile.gst_number && <div><span className="font-medium">GST:</span> {selectedProfile.gst_number}</div>}
            {(selectedProfile.latitude || selectedProfile.longitude) && (
              <div><span className="font-medium">Coordinates:</span> {selectedProfile.latitude}, {selectedProfile.longitude}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
