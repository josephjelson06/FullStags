import { NavLink, Outlet, useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import NotificationBell from "./NotificationBell";
import type { Role } from "../types";

const menuByRole: Record<Role, { label: string; to: string }[]> = {
  buyer: [
    { label: "Dashboard", to: "/buyer" },
    { label: "Catalog", to: "/buyer/catalog" },
    { label: "Place Order", to: "/buyer/place-order" },
    { label: "My Orders", to: "/buyer/orders" },
    { label: "Deliveries", to: "/buyer/deliveries" },
  ],
  supplier: [
    { label: "Dashboard", to: "/supplier" },
    { label: "Catalog", to: "/supplier/catalog" },
    { label: "Inventory", to: "/supplier/inventory" },
    { label: "Assigned Orders", to: "/supplier/assigned" },
    { label: "Deliveries", to: "/supplier/deliveries" },
  ],
  admin: [
    { label: "Dashboard", to: "/admin" },
    { label: "Users", to: "/admin/users" },
    { label: "All Orders", to: "/admin/orders" },
    { label: "Matching", to: "/admin/matching" },
    { label: "Deliveries", to: "/admin/deliveries" },
    { label: "Events", to: "/admin/events" },
    { label: "Analytics", to: "/admin/analytics" },
  ],
};

const Layout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const role = user?.role ?? "buyer";
  const menuItems = menuByRole[role];
  const displayName =
    user?.factory_name || user?.business_name || user?.email || "User";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>SpareHub</h2>
        {menuItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? "nav-link active" : "nav-link"
            }
          >
            {item.label}
          </NavLink>
        ))}
      </aside>
      <main className="main">
        <div className="topbar">
          <div>
            <div className="badge">{role.toUpperCase()}</div>
            <div style={{ marginTop: "0.35rem", fontWeight: 600 }}>{displayName}</div>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <NotificationBell />
            <button className="secondary" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
