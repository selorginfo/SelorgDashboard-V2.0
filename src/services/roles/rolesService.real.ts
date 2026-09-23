import { api } from "@/lib/apiClient";
import type { RolesService, ApiRole, RolesKpis, RoleUpdate } from "./rolesService";

function extract(res: unknown): ApiRole[] {
  if (Array.isArray(res)) return res as ApiRole[];
  const r = res as Record<string, unknown>;
  return ((r["data"] ?? r["list"] ?? r["roles"] ?? []) as ApiRole[]);
}

export const realRolesService: RolesService = {
  // Errors propagate so the page can show a retryable error state. Swallowing them here made a
  // failed/unauthorised request look like "no roles configured", which is a very different
  // thing to an administrator looking at an RBAC screen.
  async listRoles(): Promise<ApiRole[]> {
    const res = await api.get<unknown>("/api/v1/admin/roles");
    return extract(res);
  },

  async getKpis(): Promise<RolesKpis> {
    const roles = await this.listRoles();
    const total = roles.length;
    const underReview = roles.filter((r) => r.status === "review").length;
    return { total, withRefundRights: 0, withApproveRights: 0, changesLast30d: 0, underReview };
  },

  async createRole(input: RoleUpdate & { name: string }): Promise<ApiRole> {
    return api.post<ApiRole>("/api/v1/admin/roles", input);
  },

  async updateRole(id: string, input: RoleUpdate): Promise<ApiRole> {
    return api.put<ApiRole>(`/api/v1/admin/roles/${id}`, input);
  },

  async deleteRole(id: string): Promise<void> {
    await api.delete<unknown>(`/api/v1/admin/roles/${id}`);
  },

  async updateRoleMatrix(id: string, permissions: string[]): Promise<ApiRole> {
    return api.put<ApiRole>(`/api/v1/admin/roles/${id}/matrix`, { permissions });
  },
};
