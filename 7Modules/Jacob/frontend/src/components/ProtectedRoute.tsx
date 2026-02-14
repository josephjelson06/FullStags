import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

type Role = "buyer" | "supplier" | "admin";

type ProtectedRouteProps = {
  allowedRoles: Role[];
  children: ReactNode;
};

const roleHomeMap: Record<Role, string> = {
  buyer: "/buyer/orders",
  supplier: "/supplier/dashboard",
  admin: "/admin/orders",
};

function getCurrentRole(): Role | null {
  const userJson = localStorage.getItem("auth_user") || localStorage.getItem("x-test-user");
  if (!userJson) {
    return null;
  }

  try {
    const user = JSON.parse(userJson);
    if (user?.role === "buyer" || user?.role === "supplier" || user?.role === "admin") {
      return user.role;
    }
    return null;
  } catch {
    return null;
  }
}

export default function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const role = getCurrentRole();

  if (!role) {
    return <Navigate to="/buyer/orders" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={roleHomeMap[role]} replace />;
  }

  return <>{children}</>;
}
