import catalog from "@/data/dashboardApiCatalog.json";
import { api } from "@/lib/apiClient";

export type CatalogEndpoint = { method: string; path: string };

export const DASHBOARD_API_CATALOG = catalog as CatalogEndpoint[];

const PREFIXES = [
  "/api/v1/admin",
  "/api/v1/customer/admin",
  "/api/v1/darkstore",
  "/api/v1/warehouse",
  "/api/v1/rider",
  "/api/v1/merch",
  "/api/v1/production",
  "/api/v1/shared",
  "/api/v1/logistics",
];

export function namespaceOf(path: string): string {
  const hit = PREFIXES.filter((p) => path === p || path.startsWith(p + "/")).sort((a, b) => b.length - a.length)[0];
  return hit || "/api/v1";
}

export function endpointsForModule(moduleId: string): CatalogEndpoint[] {
  const key = moduleId.replace(/-/g, "");
  const aliases: Record<string, string[]> = {
    customers: ["/api/v1/admin/customers"],
    support: ["/api/v1/admin/support", "/api/v1/admin/support-chat"],
    catalog: ["/api/v1/admin/products"],
    categories: ["/api/v1/customer/admin/categories"],
    promotions: ["/api/v1/customer/admin/coupons"],
    cms: ["/api/v1/customer/admin/cms", "/api/v1/customer/admin/pages"],
    "cms-home": ["/api/v1/customer/admin/home"],
    "cms-media": ["/api/v1/customer/admin/cms/media"],
    mastersheet: ["/api/v1/admin/mastersheet"],
    orders: ["/api/v1/admin/orders"],
    picking: ["/api/v1/darkstore"],
    riders: ["/api/v1/rider", "/api/v1/admin/riders"],
    "picker-approvals": ["/api/v1/admin/picker", "/api/v1/admin/pickers"],
    roster: ["/api/v1/admin/picker"],
    vendors: ["/api/v1/admin/vendor"],
    notifications: ["/api/v1/admin/notifications"],
    users: ["/api/v1/admin/users"],
    roles: ["/api/v1/admin/roles"],
    settings: ["/api/v1/admin/app-settings", "/api/v1/admin/platform-config", "/api/v1/admin/system"],
    reports: ["/api/v1/darkstore/reports", "/api/v1/warehouse/reports", "/api/v1/shared/analytics"],
    wh: ["/api/v1/warehouse"],
    "wh-inv": ["/api/v1/warehouse"],
    inbound: ["/api/v1/warehouse/inbound"],
    putaway: ["/api/v1/warehouse"],
    transfers: ["/api/v1/warehouse"],
    stores: ["/api/v1/admin/darkstores", "/api/v1/darkstore"],
    "store-inv": ["/api/v1/darkstore/inventory"],
    "ds-overview": ["/api/v1/darkstore"],
    "api-catalog": ["/api/v1/admin", "/api/v1/customer/admin", "/api/v1/darkstore", "/api/v1/warehouse", "/api/v1/rider", "/api/v1/merch", "/api/v1/production", "/api/v1/shared", "/api/v1/logistics"],
    barcodes: ["/api/v1/warehouse/utilities/print-barcodes"],
    "rpt-overall": ["/api/v1/shared/analytics", "/api/v1/admin/analytics"],
    "rpt-sales": ["/api/v1/admin/analytics", "/api/v1/shared/analytics"],
    "rpt-ops": ["/api/v1/darkstore/reports", "/api/v1/warehouse/reports", "/api/v1/production/analytics"],
    "rpt-people": ["/api/v1/admin/picker", "/api/v1/admin/analytics/pickers"],
    "rpt-customer": ["/api/v1/admin/customers", "/api/v1/admin/analytics"],
    "bulk-orders": ["/api/v1/shared/bulk-ops", "/api/v1/logistics"],
    "bulk-dispatch": ["/api/v1/logistics", "/api/v1/production/dispatch"],
    "bulk-track": ["/api/v1/logistics", "/api/v1/rider"],
    vehicles: ["/api/v1/rider/fleet", "/api/v1/logistics", "/api/v1/merch"],
    deliveries: ["/api/v1/rider"],
    "bd-overview": ["/api/v1/rider", "/api/v1/logistics"],
    "bd-queue": ["/api/v1/rider", "/api/v1/logistics"],
    "bd-batches": ["/api/v1/rider", "/api/v1/logistics"],
    "bd-route": ["/api/v1/rider", "/api/v1/merch"],
    "bd-track": ["/api/v1/rider"],
    "bd-ops": ["/api/v1/rider"],
    "bd-exceptions": ["/api/v1/rider", "/api/v1/admin/support"],
    "inbound-asn": ["/api/v1/warehouse"],
    "wh-transfer": ["/api/v1/warehouse"],
    "wh-transfer-approve": ["/api/v1/warehouse"],
    "wh-audit": ["/api/v1/warehouse"],
    "ds-audit": ["/api/v1/darkstore/utilities"],
    "ds-users": ["/api/v1/admin/darkstores"],
    "ds-products": ["/api/v1/darkstore"],
    "ds-request": ["/api/v1/darkstore", "/api/v1/warehouse"],
    "ds-receive": ["/api/v1/darkstore"],
    payments: ["/api/v1/admin/finance"],
    returns: ["/api/v1/admin/support"],
    zones: ["/api/v1/admin/zones", "/api/v1/merch"],
    integrations: ["/api/v1/admin/integrations"],
    audit: ["/api/v1/admin/audit", "/api/v1/darkstore/utilities/audit-logs"],
    "picker-dir": ["/api/v1/admin/picker", "/api/v1/admin/pickers"],
    "rider-dir": ["/api/v1/rider", "/api/v1/admin/riders"],
    "rider-earn": ["/api/v1/admin/riders", "/api/v1/rider"],
    "picker-earn": ["/api/v1/admin/picker"],
    payouts: ["/api/v1/admin/picker"],
    shifts: ["/api/v1/admin/picker", "/api/v1/rider/shifts"],
    "rider-approvals": ["/api/v1/admin/riders"],
    "earn-rules": ["/api/v1/admin/earning-rules", "/api/v1/rider"],
  };
  const prefixes = aliases[moduleId] || aliases[key];
  if (prefixes) {
    return DASHBOARD_API_CATALOG.filter((e) => prefixes.some((p) => e.path === p || e.path.startsWith(p + "/")));
  }
  const needle = moduleId.replace(/-/g, "/");
  return DASHBOARD_API_CATALOG.filter((e) => e.path.includes(needle)).slice(0, 40);
}

export function fillPathParams(path: string, fallbackId = "000000000000000000000000"): string {
  return path.replace(/:([A-Za-z0-9_]+)/g, fallbackId);
}

export async function invokeCatalogEndpoint(ep: CatalogEndpoint, body?: unknown): Promise<unknown> {
  return api.request(ep.method, fillPathParams(ep.path), body);
}
