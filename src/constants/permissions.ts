import type { PermissionAction, Role } from "@/types/auth";
import type { ModuleId } from "@/constants/nav";
import { NAV_GROUPS } from "@/constants/nav";

/**
 * Reconstructed from the Roles & Permissions screen in the approved design (8 roles, per-module
 * View/Create/Edit/Delete/Approve/Refund/Assign/Export rights, "Sensitive rights" summary) plus
 * the module ownership implied by each role's job. The design gives qualitative rights per role
 * ("Refund ≤ ₹500", "Approve", "Assign") rather than a literal per-cell matrix, so this is a
 * faithful, documented reconstruction — not invented scope. Super Admin and Operations Admin are
 * global; every other role is scoped to the modules its job actually touches.
 *
 * This is UX-only. The backend remains the authority on every mutating action (request §10/§49).
 */

/** Delivery screens a Rider Manager runs day to day — single and bulk delivery alike. */
const DELIVERY_OPS: ModuleId[] = [
  "deliveries",
  "bd-overview",
  "bd-queue",
  "bulk-orders",
  "bd-batches",
  "bulk-dispatch",
  "bd-stops",
  "bd-route",
  "bd-track",
  "bulk-track",
  "bd-ops",
  "bd-exceptions",
  "vehicles",
];

const OWNED_MODULES: Partial<Record<Role, ModuleId[]>> = {
  "Warehouse Manager": ["wh", "wh-inv", "inbound", "putaway", "transfers"],
  "Dark Store Manager": [
    "stores",
    "store-inv",
    "picking",
    "bags",
    "racks",
    "scanner",
    "scan-history",
    "picker-approvals",
    "picker-dir",
    "picker-details",
    "picker-support",
    "hsd-devices",
    "order-progress",
  ],
  "Rider Manager": [
    "riders",
    "zones",
    "rider-approvals",
    "rider-dir",
    "rider-details",
    "roster",
    "shifts",
    "rider-support",
    "order-progress",
    "cod-collection",
    ...DELIVERY_OPS,
  ],
  "Customer Support": [
    "customers",
    "support",
    "returns",
    "rider-support",
    "picker-support",
    "customer-reviews",
    "order-progress",
  ],
  "Finance Admin": [
    "payments",
    "returns",
    "rider-earn",
    "picker-earn",
    "payouts",
    "earn-rules",
    "cod-collection",
    "stall-staff",
    "stall-incentives",
    "stall-earnings",
  ],
  "Catalog Manager": ["catalog", "categories", "promotions", "cms", "cms-home", "cms-media", "cms-cal", "stall-areas", "stalls", "stall-ads", "stall-samples"],
};

const APPROVE_MODULES: Partial<Record<Role, ModuleId[]>> = {
  "Warehouse Manager": ["transfers", "inbound", "putaway"],
  "Rider Manager": ["rider-approvals", ...DELIVERY_OPS],
  "Finance Admin": ["stall-incentives", "stall-earnings"],
  "Dark Store Manager": ["picker-approvals"],
  "Catalog Manager": ["catalog", "promotions", "stall-ads", "stall-samples"],
};

const ASSIGN_MODULES: Partial<Record<Role, ModuleId[]>> = {
  "Dark Store Manager": ["orders", "picking", "picker-dir", "roster"],
  "Rider Manager": ["orders", "riders", "roster", ...DELIVERY_OPS],
  "Warehouse Manager": ["transfers"],
};

const REFUND_MODULES: Role[] = ["Finance Admin", "Customer Support"];
const EXPORT_ROLES: Role[] = ["Finance Admin"];
const DELETE_ROLES: Role[] = [];

/** Not a NAV group entry — every signed-in role manages its own account. */
const ALWAYS_VISIBLE_MODULES: ModuleId[] = ["account", "api-catalog"];

/** Drill-down / direct-URL routes (request §9) that aren't top-level nav items in their own
 * right — visibility inherits from the module a reviewer would have reached them from. */
const SUB_MODULE_PARENT: Partial<Record<ModuleId, ModuleId>> = {
  "order-detail": "orders",
  "scan-history": "scanner",
  payouts: "rider-earn",
};

function moduleVisibleToRole(moduleId: ModuleId, role: Role): boolean {
  if (ALWAYS_VISIBLE_MODULES.includes(moduleId)) return true;
  const group = NAV_GROUPS.find((g) => g.items.some((i) => i.id === moduleId));
  if (!group) {
    const parent = SUB_MODULE_PARENT[moduleId];
    return parent ? moduleVisibleToRole(parent, role) : false;
  }
  return group.roles === null || group.roles.includes(role);
}

export function hasPermission(role: Role, moduleId: ModuleId, action: PermissionAction): boolean {
  if (role === "Super Admin") return true;
  if (!moduleVisibleToRole(moduleId, role)) return false;

  switch (action) {
    case "view":
      return moduleVisibleToRole(moduleId, role);
    case "export":
      return role === "Operations Admin" || EXPORT_ROLES.includes(role);
    case "delete":
      return role === "Operations Admin" || DELETE_ROLES.includes(role);
    case "approve":
      return role === "Operations Admin" || (APPROVE_MODULES[role]?.includes(moduleId) ?? false);
    case "refund":
      return REFUND_MODULES.includes(role) && ["payments", "returns", "support"].includes(moduleId);
    case "assign":
      return role === "Operations Admin" || (ASSIGN_MODULES[role]?.includes(moduleId) ?? false);
    case "create":
    case "edit":
      return (
        role === "Operations Admin" ||
        (OWNED_MODULES[role]?.includes(moduleId) ?? false)
      );
    default:
      return false;
  }
}
