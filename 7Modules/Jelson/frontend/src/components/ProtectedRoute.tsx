import { ReactNode, useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import type { Role } from "../types";

interface ProtectedRouteProps {
  role?: Role;
  children?: ReactNode;
}

const ProtectedRoute = ({ role, children }: ProtectedRouteProps) => {
  const { isAuthenticated, user, fetchProfile } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchProfile();
    }
  }, [isAuthenticated, user, fetchProfile]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && user && user.role !== role) {
    return <Navigate to="/login" replace />;
  }

  if (children) {
    return <>{children}</>;
  }

  return <Outlet />;
};

export default ProtectedRoute;
