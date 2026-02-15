import { useState } from 'react';
import {
  BarChart3,
  Bell,
  Box,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  ListChecks,
  MapPin,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingCart,
  Store,
  Truck,
  Upload,
  User,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

/* ── Types ──────────────────────── */

interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

interface NavGroup {
  section: string;
  items: NavItem[];
}

/* ── Nav definitions per role ──── */

const BUYER_NAV: NavGroup[] = [
  {
    section: 'Matching',
    items: [
      { label: 'Emergency Request', path: '/buyer/emergency', icon: Search },
    ],
  },
  {
    section: 'Orders',
    items: [
      { label: 'My Orders', path: '/buyer/orders', icon: ListChecks },
      { label: 'Cart / Checkout', path: '/buyer/cart', icon: ShoppingCart },
    ],
  },
  {
    section: 'Notifications',
    items: [
      { label: 'Notifications', path: '/buyer/notifications', icon: Bell },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { label: 'My Dashboard', path: '/buyer/analytics', icon: BarChart3 },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'My Profile', path: '/buyer/profile', icon: User },
    ],
  },
];

const SUPPLIER_NAV: NavGroup[] = [
  {
    section: 'Routes',
    items: [
      { label: 'Outgoing Deliveries', path: '/supplier/deliveries', icon: Truck },
    ],
  },
  {
    section: 'Inventory',
    items: [
      { label: 'My Inventory', path: '/supplier/inventory', icon: Package },
      { label: 'Add Part', path: '/supplier/inventory/new', icon: Box },
      { label: 'Bulk Upload', path: '/supplier/inventory/upload', icon: Upload },
      { label: 'Low Stock Alerts', path: '/supplier/inventory/low-stock', icon: Bell },
    ],
  },
  {
    section: 'Orders',
    items: [
      { label: 'Incoming Orders', path: '/supplier/orders', icon: ClipboardList },
      { label: 'Order History', path: '/supplier/orders/history', icon: ListChecks },
    ],
  },
  {
    section: 'Notifications',
    items: [
      { label: 'Notifications', path: '/supplier/notifications', icon: Bell },
    ],
  },
  {
    section: 'Analytics',
    items: [
      { label: 'My Dashboard', path: '/supplier/analytics', icon: BarChart3 },
      { label: 'Reports', path: '/supplier/analytics/reports', icon: BarChart3 },
    ],
  },
  {
    section: 'Account',
    items: [
      { label: 'My Profile', path: '/supplier/profile', icon: User },
    ],
  },
];

const ADMIN_NAV: NavGroup[] = [
  {
    section: 'Analytics',
    items: [
      { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Reports', path: '/admin/analytics/reports', icon: BarChart3 },
    ],
  },
  {
    section: 'Users & RBAC',
    items: [
      { label: 'User Management', path: '/admin/users', icon: Users },
      { label: 'Roles & Permissions', path: '/admin/roles', icon: Settings },
    ],
  },
  {
    section: 'Matching Engine',
    items: [
      { label: 'Configuration', path: '/admin/matching/config', icon: Cpu },
      { label: 'Match Logs', path: '/admin/matching/logs', icon: ListChecks },
    ],
  },
  {
    section: 'Route Optimization',
    items: [
      { label: 'Route Monitor', path: '/admin/routes/monitor', icon: MapPin },
      { label: 'Route History', path: '/admin/routes/history', icon: Truck },
    ],
  },
  {
    section: 'Suppliers & Inventory',
    items: [
      { label: 'All Suppliers', path: '/admin/suppliers', icon: Store },
      { label: 'Platform Inventory', path: '/admin/inventory', icon: Package },
    ],
  },
  {
    section: 'Orders',
    items: [
      { label: 'All Orders', path: '/admin/orders', icon: ClipboardList },
      { label: 'Cancelled Orders', path: '/admin/orders/disputed', icon: ClipboardList },
    ],
  },
  {
    section: 'Notifications',
    items: [
      { label: 'Notification Center', path: '/admin/notifications', icon: Bell },
      { label: 'Templates', path: '/admin/notifications/templates', icon: Settings },
    ],
  },
];

const NAV_MAP: Record<UserRole, NavGroup[]> = {
  buyer: BUYER_NAV,
  supplier: SUPPLIER_NAV,
  admin: ADMIN_NAV,
};

/* ── Sidebar Component ──────────── */

export function Sidebar() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const role = user?.role;
  const groups = role ? NAV_MAP[role] : [];

  return (
    <>
      {/* Mobile toggle */}
      <button
        type="button"
        onClick={() => setIsOpen((c) => !c)}
        className="fixed left-4 top-4 z-30 flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface shadow-sm text-text-secondary md:hidden"
      >
        {isOpen ? <X size={16} /> : <Menu size={16} />}
      </button>

      {/* Mobile backdrop */}
      {isOpen ? (
        <div
          className="animate-fade-in fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }}
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r transition-all duration-300 md:static md:translate-x-0`}
        style={{
          borderColor: 'var(--color-border)',
          background: 'var(--color-bg)',
        }}
      >
        <nav className="mt-14 flex-1 space-y-4 overflow-y-auto px-3 pb-6 md:mt-4">
          {groups.map((group) => (
            <div key={group.section}>
              <p
                className="mb-1 px-3 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: 'var(--color-text-muted)' }}
              >
                {group.section}
              </p>

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setIsOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-bold transition-all ${
                          isActive
                            ? 'text-text-primary'
                            : 'text-text-secondary hover:bg-surface-hover hover:text-text-primary'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <div
                              className="absolute left-[-12px] top-1/2 h-5 w-1 -translate-y-1/2 rounded-r"
                              style={{
                                background: 'var(--color-primary)',
                                boxShadow: '0 0 10px rgba(255, 107, 0, 0.8)',
                              }}
                            />
                          )}
                          <Icon
                            size={16}
                            className="shrink-0"
                            style={isActive ? { color: 'var(--color-primary)' } : undefined}
                          />
                          {item.label}
                        </>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--color-border)' }}>
          <p className="text-[10px] font-medium uppercase tracking-widest text-text-muted">
            {role ? `${role.charAt(0).toUpperCase()}${role.slice(1)} Panel` : 'Demo Mode'}
          </p>
        </div>
      </aside>
    </>
  );
}
