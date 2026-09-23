import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AdminUser, Role } from "@/types/auth";
import { api, removeToken } from "@/lib/apiClient";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 1 day — matches cookie maxAge

interface SessionState {
  user: AdminUser | null;
  role: Role | null;
  isAuthenticated: boolean;
  loginExpiry: number | null;
  pendingOtpEmail: string | null;
  pendingOtpRole: Role | null;
  login: (user: AdminUser) => void;
  requireOtp: (email: string, role: Role) => void;
  completeOtp: (user: AdminUser) => void;
  setRole: (role: Role) => void;
  logout: () => void;
  isSessionValid: () => boolean;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      loginExpiry: null,
      pendingOtpEmail: null,
      pendingOtpRole: null,
      login: (user) =>
        set({ user, role: user.role, isAuthenticated: true, loginExpiry: Date.now() + SESSION_TTL_MS, pendingOtpEmail: null, pendingOtpRole: null }),
      requireOtp: (email, role) => set({ pendingOtpEmail: email, pendingOtpRole: role }),
      completeOtp: (user) =>
        set({ user, role: user.role, isAuthenticated: true, loginExpiry: Date.now() + SESSION_TTL_MS, pendingOtpEmail: null, pendingOtpRole: null }),
      setRole: (role) =>
        set((s) => (s.user ? { role, user: { ...s.user, role } } : { role })),
      logout: () => {
        // Clear legacy localStorage token and tell backend to revoke cookie
        removeToken();
        api.post("/api/v1/admin/auth/logout").catch(() => undefined);
        set({
          user: null,
          role: null,
          isAuthenticated: false,
          loginExpiry: null,
          pendingOtpEmail: null,
          pendingOtpRole: null,
        });
      },
      isSessionValid: () => {
        const { isAuthenticated, loginExpiry } = useSessionStore.getState();
        return isAuthenticated && loginExpiry !== null && Date.now() < loginExpiry;
      },
    }),
    { name: "selorg-admin-session" }
  )
);
