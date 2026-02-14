import { useLocation, useNavigate } from "react-router-dom";

import type { UserRole } from "../hooks/useAuth";
import { setDemoRole } from "../hooks/useAuth";

const DEFAULT_ROUTE_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin/matching",
  buyer: "/orders",
  supplier: "/orders",
};

const AuthLoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const from = (location.state as { from?: string } | null)?.from;

  const handleQuickRole = (role: UserRole) => {
    setDemoRole(role);
    navigate(from ?? DEFAULT_ROUTE_BY_ROLE[role], { replace: true });
  };

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <p className="eyebrow">Module 1</p>
          <h1>Auth Entry</h1>
          <p className="subtitle">
            JWT login routes come from Module 1. Use quick role mode to validate protected routes before merge.
          </p>
        </div>
      </header>

      <section className="card auth-card">
        <h2>Quick Role Mode</h2>
        <p className="hint">Pick a role to continue in demo mode.</p>
        <div className="toggle-row">
          <button className="ghost" onClick={() => handleQuickRole("admin")}>
            Continue as Admin
          </button>
          <button className="ghost" onClick={() => handleQuickRole("supplier")}>
            Continue as Supplier
          </button>
          <button className="ghost" onClick={() => handleQuickRole("buyer")}>
            Continue as Buyer
          </button>
        </div>
      </section>
    </div>
  );
};

export default AuthLoginPage;
