import { create } from "zustand";
import api from "../api/client";
import useNotificationStore from "./notificationStore";
import type { Role, UserProfile } from "../types";

interface LoginResponse {
  access_token: string;
  token_type: string;
  role: Role;
  user_id: number;
}

interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<Role>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
}

const storedToken = localStorage.getItem("token");

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: storedToken,
  isAuthenticated: Boolean(storedToken),
  login: async (email, password) => {
    const response = await api.post<LoginResponse>("/auth/login", { email, password });
    const { access_token, role } = response.data;
    localStorage.setItem("token", access_token);
    set({ token: access_token, isAuthenticated: true });
    await get().fetchProfile();
    return role;
  },
  logout: () => {
    localStorage.removeItem("token");
    useNotificationStore.getState().reset();
    set({ token: null, isAuthenticated: false, user: null });
  },
  fetchProfile: async () => {
    const response = await api.get<UserProfile>("/auth/me");
    set({ user: response.data, isAuthenticated: true });
  },
}));

export default useAuthStore;
