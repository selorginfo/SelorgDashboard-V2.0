import type { WorkspaceRow } from "@/types/common";

export type AccessScope = "global" | "zone" | "store";

export interface ApiRole {
  _id: string;
  /** Backend `formatRole` returns the document id as `id`; older payloads only had `_id`. */
  id?: string;
  name: string;
  scope?: string;
  /** Backend field — `store` means users need an assigned dark store. */
  accessScope?: AccessScope;
  userCount?: number;
  moduleCount?: number;
  sensitiveRights?: string;
  twoFactorRequired?: boolean;
  updatedAt?: string;
  status?: string;
  /** Canonical permission keys currently granted, including `*` / `prefix.*` wildcards. */
  permissions?: string[];
  /** `system` roles are protected server-side and cannot be edited or deleted. */
  roleType?: string;
  description?: string;
}

/** Backend responses vary between `id` and `_id`; callers need one reliable accessor. */
export function roleId(r: ApiRole): string {
  return r.id ?? r._id;
}

export function isStoreScopedRole(r: ApiRole | null | undefined): boolean {
  if (!r) return false;
  if (r.accessScope === "store") return true;
  const name = (r.name || "").toLowerCase();
  return name.includes("dark store") || name.includes("warehouse manager");
}

export interface RolesKpis {
  total: number;
  withRefundRights: number;
  withApproveRights: number;
  changesLast30d: number;
  underReview: number;
}

export interface RoleUpdate {
  name?: string;
  scope?: string;
  accessScope?: AccessScope;
  description?: string;
  permissions?: string[];
  twoFactorRequired?: boolean;
  status?: string;
}

export interface CreateRoleInput {
  name: string;
  description?: string;
  accessScope?: AccessScope;
  permissions: string[];
}

export interface RolesService {
  listRoles(): Promise<ApiRole[]>;
  getKpis(): Promise<RolesKpis>;
  createRole(input: CreateRoleInput): Promise<ApiRole>;
  updateRole(id: string, input: RoleUpdate): Promise<ApiRole>;
  deleteRole(id: string): Promise<void>;
  /**
   * Replace a role's permission grid. `permissions` are canonical backend keys
   * (`{domain}.{resource}.{action}`), not the dashboard's ModuleId/action pairs.
   */
  updateRoleMatrix(id: string, permissions: string[]): Promise<ApiRole>;
}

export function roleToRow(r: ApiRole): WorkspaceRow {
  const updated = r.updatedAt
    ? new Date(r.updatedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    : "—";
  const status = r.status === "active" ? { label: "Active", tone: "green" as const }
    : r.status === "system" || r.roleType === "system" ? { label: "System", tone: "blue" as const }
    : { label: "Review", tone: "amber" as const };
  return [
    r.name,
    r.scope ?? (r.accessScope === "store" ? "Assigned store" : "Global"),
    String(r.userCount ?? 0),
    String(r.moduleCount ?? "—"),
    r.sensitiveRights ?? "—",
    r.twoFactorRequired ? "Required" : "Optional",
    updated,
    status,
  ];
}

/** Sensible default permission packs when creating a role from the dashboard. */
export const ROLE_PERMISSION_PRESETS: Record<string, string[]> = {
  "Dark Store Manager": [
    "inventory.*",
    "orders.*",
    "catalog.products.read",
    "catalog.categories.read",
    "delivery.track.read",
    "analytics.reports.read",
    "operations.*",
  ],
  "Warehouse Manager": [
    "warehouse.*",
    "inventory.stock.read",
    "inventory.stock.write",
    "analytics.reports.read",
  ],
  "Operations Admin": ["*"],
};
