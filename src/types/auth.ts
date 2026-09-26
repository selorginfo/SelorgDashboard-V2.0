export const ROLES = [
  "Super Admin",
  "Operations Admin",
  "Warehouse Manager",
  "Dark Store Manager",
  "Rider Manager",
  "Customer Support",
  "Finance Admin",
  "Catalog Manager",
] as const;

export type Role = (typeof ROLES)[number];

export type PermissionAction =
  | "view"
  | "create"
  | "edit"
  | "delete"
  | "approve"
  | "refund"
  | "assign"
  | "export";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  scope: string;
  twoFactorEnabled: boolean;
  status: "active" | "invited" | "deactivated";
  /** Dark store codes / ids this user may access (empty = global / unscoped). */
  assignedStores?: string[];
  primaryStoreId?: string;
  /** Account-settings-only fields, shown on the Profile tab — populated with the design's literal
   * values for Arun K. (Super Admin), the default logged-in seed user; other roles fall back to
   * generic placeholders in the UI rather than invented specifics. */
  fullName?: string;
  phone?: string;
  scopeLabel?: string;
  employeeId?: string;
  reportingTo?: string;
  joined?: string;
}

export interface Session {
  user: AdminUser;
  role: Role;
}
