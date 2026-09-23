import { api } from "@/lib/apiClient";
import type { PermissionsService, PermissionsMatrix, PermissionModule } from "./permissionsService";

/** The API wraps payloads as `{ success, data }`; tolerate a bare object too. */
function extract(res: unknown): PermissionsMatrix {
  const root = res as Record<string, unknown>;
  const payload = (root?.["data"] ?? root) as Record<string, unknown> | undefined;
  const modules = payload?.["modules"];
  if (!Array.isArray(modules)) return { modules: [] };
  return { modules: modules as PermissionModule[] };
}

export const realPermissionsService: PermissionsService = {
  // Errors propagate so the Roles screen can show a retryable error rather than rendering an
  // empty grid that looks like "this role has no permissions".
  async getMatrix(): Promise<PermissionsMatrix> {
    const res = await api.get<unknown>("/api/v1/admin/permissions/matrix");
    return extract(res);
  },
};
