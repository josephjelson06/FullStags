import { NavLink, Outlet, useNavigate } from "react-router-dom";

import type { UserRole } from "../hooks/useAuth";
import { clearSession, setDemoRole, useAuth } from "../hooks/useAuth";

type NavItem = {
  path: string;
  label: string;
  roles?: UserRole[];
};

const NAV_ITEMS: NavItem[] = [
  { path: "/auth/login", label: "Auth" },
  { path: "/users/profile", label: "Users", roles: ["buyer", "supplier", "admin"] },
  { path: "/suppliers/catalog", label: "Suppliers", roles: ["supplier", "admin"] },
  { path: "/inventory", label: "Inventory", roles: ["supplier", "admin"] },
  { path: "/orders", label: "Orders", roles: ["buyer", "supplier", "admin"] },
  { path: "/admin/matching", label: "Matching", roles: ["admin"] },
  { path: "/admin/deliveries", label: "Deliveries", roles: ["admin"] },
  { path: "/notifications", label: "Notifications", roles: ["buyer", "supplier", "admin"] },
  { path: "/analytics", label: "Analytics", roles: ["admin"] },
];

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin/matching",
  buyer: "/orders",
  supplier: "/orders",
};

const AppLayout = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (!item.roles || item.roles.length === 0) {
      return true;
    }
    return user.role ? item.roles.includes(user.role) : false;
  });

  const handleRoleSwitch = (nextRole: string) => {
    if (nextRole === "") {
      setDemoRole(null);
      navigate("/auth/login", { replace: true });
      return;
    }

    if (nextRole === "buyer" || nextRole === "supplier" || nextRole === "admin") {
      setDemoRole(nextRole);
      navigate(DEFAULT_ROUTE_BY_ROLE[nextRole], { replace: true });
    }
  };

  const handleSignOut = () => {
    clearSession();
    navigate("/auth/login", { replace: true });
  };

  return (
    <div className="shell">
      <aside className="shell__sidebar">
        <div className="shell__brand">
          <span className="shell__eyebrow">Phase 2</span>
          <h2>Unified Control</h2>
          <p className="shell__meta">Role: {user.role ?? "guest"} ({user.source})</p>
        </div>

        <nav className="shell__nav">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => `shell__link ${isActive ? "active" : ""}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="shell__controls">
          <label htmlFor="role-switch">Demo Role</label>
          <select
            id="role-switch"
            value={user.source === "demo" ? user.role ?? "" : ""}
            onChange={(event) => handleRoleSwitch(event.target.value)}
          >
            <option value="">Use token</option>
            <option value="admin">Admin</option>
            <option value="supplier">Supplier</option>
            <option value="buyer">Buyer</option>
          </select>
          <button className="ghost" onClick={handleSignOut}>
            Clear Session
          </button>
        </div>
      </aside>

      <main className="shell__content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
