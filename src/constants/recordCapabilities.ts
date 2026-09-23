import type { ModuleId } from "@/constants/nav";

/**
 * Transcribed verbatim from the approved design's `ENTITY`/`CAP` maps
 * (design-reference/Selorg Admin Dashboard.dc.html:4913-4946) — what a route's records are
 * called, and whether the module supports create/update/delete at all ("" = system-generated,
 * fully read-only). Drives the generic Workspace screen's "+ New {entity}" button and read-only
 * pill (`dc.html:3559-3571`).
 */
export const ENTITY: Partial<Record<ModuleId, string>> = {
  orders: "Order",
  exceptions: "Exception",
  returns: "Return",
  wh: "Warehouse activity",
  "wh-inv": "Stock batch",
  inbound: "Receiving record",
  putaway: "Putaway task",
  transfers: "Transfer",
  stores: "Dark store",
  "store-inv": "Store stock record",
  picking: "Pick task",
  scanner: "Scanner record",
  catalog: "Product",
  promotions: "Campaign",
  cms: "Content item",
  vendors: "Vendor",
  categories: "Category",
  "rider-approvals": "Application",
  "picker-approvals": "Application",
  "rider-dir": "Rider",
  "picker-dir": "Picker",
  "rider-earn": "Earning",
  "picker-earn": "Earning",
  "earn-rules": "Earning rule",
  "rider-support": "Ticket",
  "picker-support": "Ticket",
  shifts: "Shift template",
  roster: "Roster entry",
  payouts: "Payout run",
  "cms-home": "Home section",
  "cms-media": "Asset",
  "cms-cal": "Scheduled item",
  riders: "Rider record",
  zones: "Zone",
  customers: "Customer",
  payments: "Transaction",
  support: "Ticket",
  notifications: "Notification rule",
  users: "Admin user",
  roles: "Role",
  audit: "Audit note",
  settings: "Setting",
  integrations: "Integration",
  reports: "Report",
  "rpt-overall": "Report line",
  "rpt-sales": "Sales line",
  "rpt-ops": "Ops metric",
  "rpt-people": "Person",
  "rpt-customer": "Segment",
  bags: "Bag",
  racks: "Staging rack",
  "scan-history": "Scan event",
};

/** "c"/"u"/"d" letters present = create/update/delete allowed; "" = fully system-generated/read-only. */
export const CAP: Partial<Record<ModuleId, string>> = {
  catalog: "cud",
  promotions: "cud",
  cms: "cud",
  zones: "cud",
  vendors: "cud",
  "cms-home": "cud",
  "cms-media": "cud",
  "cms-cal": "u",
  categories: "cud",
  "rider-approvals": "u",
  "picker-approvals": "u",
  "rider-dir": "cu",
  "picker-dir": "cu",
  "rider-earn": "u",
  "picker-earn": "u",
  "earn-rules": "cu",
  "rider-support": "cu",
  "picker-support": "cu",
  shifts: "cud",
  roster: "cu",
  payouts: "u",
  stores: "cud",
  settings: "cud",
  integrations: "cud",
  notifications: "cud",
  riders: "cud",
  scanner: "cud",
  users: "cud",
  roles: "cu",
  transfers: "cu",
  inbound: "cu",
  putaway: "cu",
  support: "cu",
  reports: "cu",
  returns: "u",
  exceptions: "u",
  customers: "u",
  "wh-inv": "u",
  "store-inv": "u",
  picking: "u",
  wh: "",
  payments: "",
  audit: "",
  "rpt-overall": "",
  "rpt-sales": "",
  "rpt-ops": "",
  "rpt-people": "",
  "rpt-customer": "",
  bags: "u",
  racks: "cud",
  "scan-history": "",
};

/** Tabs that are immutable logs even inside an otherwise-editable module (dc.html:4948). */
export const READ_ONLY_TABS = new Set([
  "All scans",
  "Product scans",
  "Bag scans",
  "Rack scans",
  "Failures",
  "Scan activity",
  "Audit",
  "Activity",
  "Analytics",
  "Performance",
  "Send log",
  "Event log",
  "Stock moves",
  "Location audit",
  "Earnings",
  "Incidents",
  "Exceptions",
  "Change history",
  "Access review",
]);

export function canCreate(moduleId: ModuleId): boolean {
  return (CAP[moduleId] ?? "cud").includes("c");
}

export function isReadOnlyModule(moduleId: ModuleId): boolean {
  return (CAP[moduleId] ?? "cud") === "";
}

export function entityLabel(moduleId: ModuleId): string {
  return ENTITY[moduleId] ?? "record";
}
