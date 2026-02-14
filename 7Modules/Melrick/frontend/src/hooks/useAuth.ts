import { useEffect, useState } from "react";

export type UserRole = "buyer" | "supplier" | "admin";

type AuthUser = {
  sub: number | null;
  role: UserRole | null;
  source: "token" | "demo" | "none";
};

const DEMO_ROLE_KEY = "demo_role";
const TOKEN_KEY = "token";
const AUTH_CHANGED_EVENT = "auth-changed";

const parseJwtPayload = (token: string): Record<string, unknown> | null => {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const payload = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const normalizeRole = (value: unknown): UserRole | null => {
  if (value === "buyer" || value === "supplier" || value === "admin") {
    return value;
  }
  return null;
};

export const getAuthUser = (): AuthUser => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    const payload = parseJwtPayload(token);
    const role = normalizeRole(payload?.role);
    if (role) {
      const sub = Number(payload?.sub);
      return {
        sub: Number.isFinite(sub) ? sub : null,
        role,
        source: "token",
      };
    }
  }

  const demoRole = normalizeRole(localStorage.getItem(DEMO_ROLE_KEY));
  if (demoRole) {
    return { sub: null, role: demoRole, source: "demo" };
  }

  return { sub: null, role: null, source: "none" };
};

export const setDemoRole = (role: UserRole | null) => {
  if (role) {
    localStorage.setItem(DEMO_ROLE_KEY, role);
  } else {
    localStorage.removeItem(DEMO_ROLE_KEY);
  }
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const clearSession = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(DEMO_ROLE_KEY);
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser>(() => getAuthUser());

  useEffect(() => {
    const sync = () => setUser(getAuthUser());

    window.addEventListener("storage", sync);
    window.addEventListener(AUTH_CHANGED_EVENT, sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener(AUTH_CHANGED_EVENT, sync);
    };
  }, []);

  return {
    user,
    setDemoRole,
    clearSession,
  };
};
