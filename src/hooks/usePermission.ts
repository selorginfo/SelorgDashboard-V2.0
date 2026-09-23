import { useCallback } from "react";
import { useSessionStore } from "@/store/sessionStore";
import { hasPermission } from "@/constants/permissions";
import type { PermissionAction } from "@/types/auth";
import type { ModuleId } from "@/constants/nav";

/**
 * UX-only gating (request §10/§49) — hides or disables actions a role shouldn't see, e.g. a
 * Rider Manager can view Earning Rules but the Activate action stays disabled. The backend
 * remains the real authority on every mutation.
 */
export function usePermission() {
  const role = useSessionStore((s) => s.role);

  const can = useCallback(
    (moduleId: ModuleId, action: PermissionAction) => {
      if (!role) return false;
      return hasPermission(role, moduleId, action);
    },
    [role]
  );

  return { role, can };
}
