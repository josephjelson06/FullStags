import { useEffect, useState } from 'react';
import { request } from '@/services/api/client';

interface User { id: number; email: string; role: string; is_active: boolean; }

const ROLES = ['admin', 'buyer', 'supplier'] as const;

export function RolesPermissions() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const data = await request<User[]>('/api/users'); setUsers(data); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const roleCounts = ROLES.map(r => ({ role: r, total: users.filter(u => u.role === r).length, active: users.filter(u => u.role === r && u.is_active).length }));

  const PERMISSIONS: Record<string, string[]> = {
    admin: ['manage_users', 'view_all_orders', 'manage_matching', 'manage_deliveries', 'view_analytics', 'manage_notifications', 'manage_inventory'],
    buyer: ['create_orders', 'view_own_orders', 'view_matches', 'track_deliveries', 'manage_profile', 'view_notifications'],
    supplier: ['manage_inventory', 'view_assigned_orders', 'accept_reject_orders', 'view_deliveries', 'manage_profile', 'view_notifications'],
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Roles & Permissions</h1>

      <div className="grid grid-cols-3 gap-4">
        {roleCounts.map(({ role, total, active }) => (
          <div key={role} className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
            <div className="flex items-center justify-between mb-3">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold capitalize ${role === 'admin' ? 'bg-purple-100 text-purple-800' : role === 'buyer' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>{role}</span>
              <span className="text-2xl font-bold">{total}</span>
            </div>
            <div className="text-sm text-gray-500">{active} active · {total - active} inactive</div>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        {ROLES.map(role => (
          <div key={role} className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
            <h2 className="text-lg font-semibold capitalize mb-3">{role} Permissions</h2>
            <div className="flex flex-wrap gap-2">
              {PERMISSIONS[role].map(perm => (
                <span key={perm} className="inline-flex items-center rounded-lg bg-gray-100 px-3 py-1.5 text-sm dark:bg-gray-800">
                  <span className="mr-2 h-2 w-2 rounded-full bg-green-500" />
                  {perm.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
