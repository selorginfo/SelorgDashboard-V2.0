import type { Badge } from "@/types/common";

/**
 * An admin user on the `users` directory board. Reshaped from SYSTEM_CONFIGS.users' four tabs
 * into one canonical roster — `accountStatus` and `flagged` derive tab membership instead of
 * duplicating rows per tab (workspace/data/system.ts:98-138).
 */
export interface SystemUser {
  id: string;
  name: string;
  role: string;
  scope: string;
  email: string;
  moduleCount: string;
  sensitiveRights: string;
  lastLogin: string;
  twoFactor: "On" | "Off" | "Pending" | "—";
  status: Badge;
  accountStatus: "active" | "invited" | "deactivated";
  /** Flagged for the "Access review" tab (2FA missing / review due). */
  flagged: boolean;
}

/** One business/warehouse/dark-store/order-rule/master-data setting row (`settings`). `tab` is
 * the group it's shown under — a Card-per-group layout, not a flat table. */
export interface SettingItem {
  id: string;
  name: string;
  scope: string;
  value: string;
  appliesTo: string;
  owner: string;
  lastChanged: string;
  changedBy: string;
  status: Badge;
  tab: "Business" | "Warehouse" | "Dark store" | "Order rules" | "Master data";
}

/** One report in the `reports` catalog index — NOT the 5 rpt-* detail pages, which stay generic
 * tables. `format` is a "CSV" / "PDF" / "CSV / PDF" string, split for badge display. */
export interface ReportCatalogItem {
  id: string;
  name: string;
  scope: string;
  period: string;
  metric: string;
  change: string;
  owner: string;
  format: string;
  status: Badge;
  tab: "Operations" | "Supply chain" | "Sales" | "Inventory" | "Rider" | "Finance";
}
