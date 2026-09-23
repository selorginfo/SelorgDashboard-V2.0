import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSessionStore } from "@/store/sessionStore";

export function RequireAuth() {
  const isAuthenticated = useSessionStore((s) => s.isAuthenticated);
  const isSessionValid = useSessionStore((s) => s.isSessionValid);
  const logout = useSessionStore((s) => s.logout);
  const location = useLocation();

  const valid = isSessionValid();

  useEffect(() => {
    if (isAuthenticated && !valid) {
      logout();
    }
  }, [isAuthenticated, valid, logout]);

  if (!isAuthenticated || !valid) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
}
