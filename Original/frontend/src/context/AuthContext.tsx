import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import {
  login as loginRequest,
  me as meRequest,
  registerBuyer,
  registerSupplier,
} from '@/services/api';
import { toSessionUser } from '@/services/adapters/authAdapter';
import type { RegisterInput, SessionUser, User } from '@/types';

const AUTH_USER_KEY = 'urgentparts_user';
const AUTH_TOKEN_KEY = 'urgentparts_token';

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterInput) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toLegacyUser(user: SessionUser): User {
  return {
    ...user,
    id: String(user.userId),
    name: user.displayName,
  };
}

function readStoredUser(): User | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = localStorage.getItem(AUTH_USER_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as User;
  } catch {
    localStorage.removeItem(AUTH_USER_KEY);
    localStorage.removeItem(AUTH_TOKEN_KEY);
    return null;
  }
}

function persistUser(user: User): void {
  localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
  localStorage.setItem(AUTH_TOKEN_KEY, user.token);
}

function clearStoredUser(): void {
  localStorage.removeItem(AUTH_USER_KEY);
  localStorage.removeItem(AUTH_TOKEN_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => readStoredUser());

  const login = useCallback(async (email: string, password: string) => {
    const tokenResponse = await loginRequest(email, password);
    localStorage.setItem(AUTH_TOKEN_KEY, tokenResponse.access_token);
    const profile = await meRequest();
    const authenticatedUser = toLegacyUser(toSessionUser(tokenResponse, profile));
    persistUser(authenticatedUser);
    setUser(authenticatedUser);
    return authenticatedUser;
  }, []);

  const register = useCallback(async (payload: RegisterInput) => {
    const tokenResponse = payload.role === 'buyer'
      ? await registerBuyer({
        email: payload.email,
        password: payload.password,
        factory_name: payload.companyName,
        industry_type: payload.industryType,
        delivery_address: payload.location.address,
        latitude: payload.location.lat,
        longitude: payload.location.lng,
      })
      : await registerSupplier({
        email: payload.email,
        password: payload.password,
        business_name: payload.companyName,
        warehouse_address: payload.location.address,
        gst_number: payload.gstNumber,
        service_radius_km: payload.serviceRadiusKm,
        latitude: payload.location.lat,
        longitude: payload.location.lng,
      });
    localStorage.setItem(AUTH_TOKEN_KEY, tokenResponse.access_token);
    const profile = await meRequest();
    const registeredUser = toLegacyUser(toSessionUser(tokenResponse, profile));
    persistUser(registeredUser);
    setUser(registeredUser);
    return registeredUser;
  }, []);

  const logout = useCallback(() => {
    clearStoredUser();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
    }),
    [login, logout, register, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used inside AuthProvider');
  }
  return context;
}
