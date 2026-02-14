import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

import type { UserRole } from "../hooks/useAuth";
import { useAuth } from "../hooks/useAuth";

type ProtectedRouteProps = {
  allowedRoles: UserRole[];
  children: ReactNode;
};

const ProtectedRoute = ({ allowedRoles, children }: ProtectedRouteProps) => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user.role) {
    return <Navigate to="/auth/login" replace state={{ from: location.pathname }} />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
