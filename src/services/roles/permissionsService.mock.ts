import type { PermissionsService, PermissionsMatrix } from "./permissionsService";

/**
 * A trimmed slice of the real catalog (see the backend's `config/permissions.ts`) — enough
 * module/action variety to exercise the grid, including modules that only expose some actions.
 */
const MATRIX: PermissionsMatrix = {
  modules: [
    {
      module: "orders",
      permissions: [
        { id: "p1", name: "orders.read", displayName: "View orders", description: "", action: "view", riskLevel: "low", dependsOn: [] },
        { id: "p2", name: "orders.cancel", displayName: "Cancel orders", description: "", action: "delete", riskLevel: "medium", dependsOn: ["orders.read"] },
        { id: "p3", name: "orders.refund", displayName: "Refund orders", description: "", action: "approve", riskLevel: "high", dependsOn: ["orders.read"] },
      ],
    },
    {
      module: "catalog",
      permissions: [
        { id: "p4", name: "catalog.products.read", displayName: "View products", description: "", action: "view", riskLevel: "low", dependsOn: [] },
        { id: "p5", name: "catalog.products.write", displayName: "Edit products", description: "", action: "edit", riskLevel: "medium", dependsOn: ["catalog.products.read"] },
        { id: "p6", name: "catalog.categories.read", displayName: "View categories", description: "", action: "view", riskLevel: "low", dependsOn: [] },
      ],
    },
    {
      module: "inventory",
      permissions: [
        { id: "p7", name: "inventory.stock.read", displayName: "View stock", description: "", action: "view", riskLevel: "low", dependsOn: [] },
        { id: "p8", name: "inventory.stock.write", displayName: "Adjust stock", description: "", action: "edit", riskLevel: "medium", dependsOn: ["inventory.stock.read"] },
        { id: "p9", name: "inventory.adjustment.approve", displayName: "Approve adjustments", description: "", action: "approve", riskLevel: "high", dependsOn: [] },
      ],
    },
    {
      module: "payments",
      permissions: [
        { id: "p10", name: "payments.read", displayName: "View payments", description: "", action: "view", riskLevel: "low", dependsOn: [] },
        { id: "p11", name: "payments.refund", displayName: "Refund payments", description: "", action: "approve", riskLevel: "high", dependsOn: ["payments.read"] },
      ],
    },
    {
      module: "admin",
      permissions: [
        { id: "p12", name: "admin.users.read", displayName: "View admin users", description: "", action: "view", riskLevel: "low", dependsOn: [] },
        { id: "p13", name: "admin.users.write", displayName: "Manage admin users", description: "", action: "manage", riskLevel: "high", dependsOn: ["admin.users.read"] },
        { id: "p14", name: "admin.roles.write", displayName: "Manage roles", description: "", action: "manage", riskLevel: "high", dependsOn: [] },
      ],
    },
    {
      module: "analytics",
      permissions: [
        { id: "p15", name: "analytics.reports.read", displayName: "View reports", description: "", action: "view", riskLevel: "low", dependsOn: [] },
      ],
    },
  ],
};

export const mockPermissionsService: PermissionsService = {
  async getMatrix(): Promise<PermissionsMatrix> {
    return structuredClone(MATRIX);
  },
};
