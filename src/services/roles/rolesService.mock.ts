import type { RolesService, ApiRole, RolesKpis, RoleUpdate, CreateRoleInput } from "./rolesService";

// `permissions` mirrors the backend's ROLE_DEFAULT_PERMISSIONS shape (canonical keys plus
// wildcards) so the Roles matrix renders and round-trips the same way it does against the API.
const MOCK_ROLES: ApiRole[] = [
  { _id: "1", name: "Super Admin", scope: "Global", accessScope: "global", userCount: 2, moduleCount: 26, sensitiveRights: "All rights", twoFactorRequired: true, status: "system", roleType: "system", permissions: ["*"] },
  { _id: "2", name: "Operations Admin", scope: "Global", accessScope: "global", userCount: 4, moduleCount: 14, sensitiveRights: "Approve, Assign", twoFactorRequired: true, status: "active", permissions: ["orders.read", "orders.cancel", "inventory.stock.read", "inventory.stock.write", "catalog.products.read", "analytics.reports.read"] },
  { _id: "3", name: "Warehouse Manager", scope: "WH-01", accessScope: "store", userCount: 3, moduleCount: 8, sensitiveRights: "Approve", twoFactorRequired: true, status: "active", permissions: ["inventory.stock.read", "inventory.stock.write", "inventory.adjustment.approve", "analytics.reports.read"] },
  { _id: "4", name: "Dark Store Manager", scope: "Assigned store", accessScope: "store", userCount: 18, moduleCount: 9, sensitiveRights: "Assign", twoFactorRequired: true, status: "active", permissions: ["inventory.*", "orders.read", "analytics.reports.read"] },
  { _id: "5", name: "Rider Manager", scope: "All hubs", accessScope: "zone", userCount: 2, moduleCount: 5, sensitiveRights: "Assign", twoFactorRequired: false, status: "review", permissions: ["orders.read", "analytics.reports.read"] },
  { _id: "6", name: "Customer Support", scope: "Global", accessScope: "global", userCount: 8, moduleCount: 6, sensitiveRights: "Refund (≤ ₹500)", twoFactorRequired: true, status: "active", permissions: ["orders.read", "orders.refund", "payments.read"] },
  { _id: "7", name: "Finance Admin", scope: "Global", accessScope: "global", userCount: 3, moduleCount: 6, sensitiveRights: "Refund, Export", twoFactorRequired: true, status: "active", permissions: ["payments.read", "payments.refund", "orders.read", "analytics.reports.read"] },
  { _id: "8", name: "Catalog Manager", scope: "Global", accessScope: "global", userCount: 1, moduleCount: 4, sensitiveRights: "Approve", twoFactorRequired: false, status: "review", permissions: ["catalog.products.read", "catalog.products.write", "catalog.categories.read"] },
];

/** In-memory so mock-mode writes are at least visible for the session. */
const roles: ApiRole[] = [...MOCK_ROLES];

function find(id: string): ApiRole {
  const role = roles.find((r) => r._id === id);
  if (!role) throw new Error(`Role ${id} not found`);
  return role;
}

export const mockRolesService: RolesService = {
  async listRoles(): Promise<ApiRole[]> {
    return roles;
  },
  async getKpis(): Promise<RolesKpis> {
    return { total: 8, withRefundRights: 3, withApproveRights: 5, changesLast30d: 17, underReview: 2 };
  },
  async createRole(input: CreateRoleInput): Promise<ApiRole> {
    const role: ApiRole = {
      _id: String(roles.length + 1),
      status: "active",
      name: input.name,
      description: input.description,
      accessScope: input.accessScope ?? "global",
      scope: input.accessScope === "store" ? "Assigned store" : input.accessScope === "zone" ? "Zone limited" : "Global",
      permissions: input.permissions,
      userCount: 0,
    };
    roles.push(role);
    return role;
  },
  async updateRole(id: string, input: RoleUpdate): Promise<ApiRole> {
    const role = find(id);
    Object.assign(role, input);
    return role;
  },
  async deleteRole(id: string): Promise<void> {
    const i = roles.findIndex((r) => r._id === id);
    if (i >= 0) roles.splice(i, 1);
  },
  async updateRoleMatrix(id: string, permissions: string[]): Promise<ApiRole> {
    const role = find(id);
    // The real endpoint refuses system roles and empty permission sets; mirror both so mock mode
    // surfaces the same failures instead of appearing to succeed.
    if (role.roleType === "system") throw new Error("System roles cannot be modified");
    if (permissions.length === 0) throw new Error("At least one permission is required");
    role.permissions = [...permissions];
    role.updatedAt = new Date().toISOString();
    return role;
  },
};
