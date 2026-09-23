import type { Role } from "@/types/auth";

export type ModuleId =
  | "dashboard"
  | "orders"
  | "order-detail"
  | "picking"
  | "bags"
  | "racks"
  | "stores"
  | "store-inv"
  | "scan-history"
  | "customers"
  | "support"
  | "returns"
  | "payments"
  | "catalog"
  | "categories"
  | "promotions"
  | "cms"
  | "cms-home"
  | "cms-media"
  | "cms-cal"
  | "mastersheet"
  | "wh"
  | "wh-inv"
  | "inbound"
  | "inbound-asn"
  | "putaway"
  | "transfers"
  | "wh-approvals"
  | "wh-transfer"
  | "wh-transfer-approve"
  | "wh-audit"
  | "wh-users"
  | "wh-create"
  | "wh-products"
  | "vendors"
  | "ds-overview"
  | "ds-users"
  | "ds-products"
  | "ds-request"
  | "ds-receive"
  | "ds-audit"
  | "stall-overview"
  | "stall-areas"
  | "stalls"
  | "stall-staff"
  | "stall-conv"
  | "stall-orders"
  | "stall-ads"
  | "stall-samples"
  | "stall-incentives"
  | "stall-earnings"
  | "bd-stops"
  | "bulk-orders"
  | "bulk-dispatch"
  | "bulk-track"
  | "vehicles"
  | "riders"
  | "deliveries"
  | "bd-overview"
  | "bd-queue"
  | "bd-batches"
  | "bd-route"
  | "bd-track"
  | "bd-ops"
  | "bd-exceptions"
  | "zones"
  | "rider-approvals"
  | "picker-approvals"
  | "rider-dir"
  | "picker-dir"
  | "rider-earn"
  | "picker-earn"
  | "earn-rules"
  | "payouts"
  | "shifts"
  | "roster"
  | "rider-support"
  | "picker-support"
  | "exceptions"
  | "scanner"
  | "barcodes"
  | "notifications"
  | "audit"
  | "rpt-overall"
  | "rpt-sales"
  | "rpt-ops"
  | "rpt-people"
  | "rpt-customer"
  | "reports"
  | "users"
  | "roles"
  | "settings"
  | "integrations"
  | "account"
  | "api-catalog";

export interface NavItem {
  id: ModuleId;
  label: string;
  /** Static count shown in the approved design; real counts are wired up per-module as data lands. */
  defaultCount?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /**
   * Roles allowed to see this group. `null` = every role.
   * The approved design's NAV table references "Content Manager" and "Vendor Manager" on two
   * groups, but the canonical 8-role set (from the Roles & Permissions screen) has neither —
   * reconciled here to Catalog Manager and Warehouse Manager respectively, the closest-scoped
   * role that already exists.
   */
  roles: Role[] | null;
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Command Centre",
    items: [{ id: "dashboard", label: "Operations Dashboard" }],
    roles: null,
  },
  {
    label: "Order Management",
    items: [
      { id: "orders", label: "Orders", defaultCount: "142" },
      { id: "picking", label: "Picking", defaultCount: "23" },
      { id: "bags", label: "Bags & Packing", defaultCount: "38" },
    ],
    roles: [
      "Super Admin",
      "Operations Admin",
      "Dark Store Manager",
      "Customer Support",
      "Warehouse Manager",
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customers", label: "Customers" },
      { id: "support", label: "Support", defaultCount: "64" },
      { id: "returns", label: "Returns & Refunds" },
      { id: "payments", label: "Payments & Finance" },
    ],
    roles: ["Super Admin", "Customer Support", "Finance Admin", "Operations Admin"],
  },
  {
    label: "Catalog & Content",
    items: [
      { id: "catalog", label: "Products" },
      { id: "categories", label: "Categories" },
      { id: "promotions", label: "Promotions" },
      { id: "cms", label: "Content Pipeline" },
      { id: "cms-home", label: "Home Page Builder" },
      { id: "cms-media", label: "Media Library" },
      { id: "cms-cal", label: "Content Calendar" },
      { id: "mastersheet", label: "Master Sheet" },
    ],
    roles: ["Super Admin", "Catalog Manager", "Operations Admin"],
  },
  {
    label: "Dark Stores",
    items: [
      { id: "ds-overview", label: "Dark Store Network" },
      { id: "stores", label: "Store Directory" },
      { id: "ds-users", label: "Store Users" },
      { id: "ds-products", label: "Store Products" },
      { id: "store-inv", label: "Store Inventory" },
      { id: "ds-request", label: "Goods Requests" },
      { id: "racks", label: "Staging Racks" },
      { id: "ds-receive", label: "Inbound to Store" },
      { id: "ds-audit", label: "Store Stock Audit" },
    ],
    roles: [
      "Super Admin",
      "Operations Admin",
      "Dark Store Manager",
      "Warehouse Manager",
    ],
  },
  {
    label: "Warehouse Management",
    items: [
      { id: "wh-create", label: "Warehouses" },
      { id: "wh-products", label: "Warehouse Products" },
      { id: "wh", label: "Central Warehouse" },
      { id: "wh-inv", label: "Warehouse Inventory" },
      { id: "inbound", label: "Receiving" },
      { id: "inbound-asn", label: "Expected Stock" },
      { id: "putaway", label: "Putaway" },
      { id: "wh-approvals", label: "Request Approvals" },
      { id: "transfers", label: "Store Transfers" },
      { id: "wh-transfer", label: "Warehouse Transfers" },
      { id: "wh-transfer-approve", label: "Transfer Approvals" },
      { id: "wh-audit", label: "Warehouse Audit" },
      { id: "wh-users", label: "Warehouse Users" },
      { id: "vendors", label: "Vendors" },
    ],
    roles: ["Super Admin", "Operations Admin", "Warehouse Manager"],
  },
  /**
   * Physical container stalls that convert walk-up customers into app users (approved design,
   * "Container Stalls"). The design scopes it to "Marketing Manager", which the canonical role set
   * doesn't have — reconciled to Catalog Manager, the role that already owns promotions.
   */
  {
    label: "Container Stalls",
    items: [
      { id: "stall-overview", label: "Network Overview" },
      { id: "stall-areas", label: "Areas & Mapping", defaultCount: "4" },
      { id: "stalls", label: "Stall Directory", defaultCount: "36" },
      { id: "stall-staff", label: "Stall Employees", defaultCount: "34" },
      { id: "stall-conv", label: "Customer Conversions" },
      { id: "stall-orders", label: "Stall Orders", defaultCount: "186" },
      { id: "stall-ads", label: "Advertisements", defaultCount: "7" },
      { id: "stall-samples", label: "Product Samples", defaultCount: "12" },
      { id: "stall-incentives", label: "Incentive Rules", defaultCount: "6" },
      { id: "stall-earnings", label: "Employee Earnings" },
    ],
    roles: ["Super Admin", "Operations Admin", "Catalog Manager", "Finance Admin"],
  },
  /**
   * Single and bulk delivery in one module, in the approved design's order. The frontend's
   * existing B2B bulk screens (Bulk Orders, Load Planning, Consignment Tracking) sit beside the
   * design's bulk-delivery screens they feed.
   */
  {
    label: "Delivery",
    items: [
      { id: "riders", label: "Riders & Live" },
      { id: "deliveries", label: "Live Deliveries", defaultCount: "31" },
      { id: "bd-overview", label: "Bulk Delivery Board" },
      { id: "bd-queue", label: "Bulk Order Queue", defaultCount: "46" },
      { id: "bulk-orders", label: "Bulk Orders", defaultCount: "14" },
      { id: "bd-batches", label: "Delivery Batches", defaultCount: "9" },
      { id: "bulk-dispatch", label: "Load Planning", defaultCount: "5" },
      { id: "bd-stops", label: "Run Sheet & Stops", defaultCount: "48" },
      { id: "bd-route", label: "Route Planning" },
      { id: "bd-track", label: "Live Vehicle Tracking", defaultCount: "6" },
      { id: "bulk-track", label: "Consignment Tracking", defaultCount: "8" },
      { id: "bd-ops", label: "Vehicle Operators", defaultCount: "14" },
      { id: "bd-exceptions", label: "Delivery Exceptions", defaultCount: "5" },
      { id: "vehicles", label: "Delivery Fleet", defaultCount: "62" },
      { id: "zones", label: "Zones & Maps" },
    ],
    roles: ["Super Admin", "Operations Admin", "Rider Manager"],
  },
  {
    label: "Workforce",
    items: [
      { id: "rider-approvals", label: "Rider Approvals" },
      { id: "picker-approvals", label: "Picker Approvals" },
      { id: "rider-dir", label: "Rider Directory" },
      { id: "picker-dir", label: "Picker Directory" },
      { id: "rider-earn", label: "Rider Earnings" },
      { id: "picker-earn", label: "Picker Earnings" },
      { id: "earn-rules", label: "Earning Rules" },
      { id: "shifts", label: "Shift Templates" },
      { id: "roster", label: "Roster & Assignment" },
      { id: "rider-support", label: "Rider Support" },
      { id: "picker-support", label: "Picker Support" },
    ],
    roles: [
      "Super Admin",
      "Operations Admin",
      "Rider Manager",
      "Finance Admin",
      "Customer Support",
    ],
  },
  {
    label: "Monitoring",
    items: [
      { id: "exceptions", label: "Exception Centre", defaultCount: "7" },
      { id: "scanner", label: "Scanner Operations" },
      { id: "barcodes", label: "Barcode Registry" },
      { id: "notifications", label: "Alerts", defaultCount: "7" },
      { id: "audit", label: "Audit Logs" },
    ],
    roles: null,
  },
  {
    label: "Analytics",
    items: [
      { id: "rpt-overall", label: "Overall Report" },
      { id: "rpt-sales", label: "Sales Report" },
      { id: "rpt-ops", label: "Operations Report" },
      { id: "rpt-people", label: "Employee Report" },
      { id: "rpt-customer", label: "Customer Report" },
      { id: "reports", label: "All Reports" },
    ],
    roles: null,
  },
  {
    label: "System",
    items: [
      { id: "users", label: "Users", defaultCount: "41" },
      { id: "roles", label: "Roles & Permissions", defaultCount: "8" },
      { id: "settings", label: "Settings" },
      { id: "integrations", label: "Integrations" },
      { id: "api-catalog", label: "API catalog" },
    ],
    roles: null,
  },
];

export const MODULE_BREADCRUMBS: Record<ModuleId, [string, string]> = {
  dashboard: ["Overview", "Command Center"],
  orders: ["Orders", "All Orders"],
  "order-detail": ["Orders", "Order Detail"],
  exceptions: ["Monitoring", "Exception Centre"],
  returns: ["Customers", "Returns & Refunds"],
  wh: ["Warehouse Management", "Central Warehouse"],
  "wh-inv": ["Warehouse Management", "Warehouse Inventory"],
  inbound: ["Warehouse Management", "Receiving"],
  "inbound-asn": ["Warehouse Management", "Expected Stock"],
  putaway: ["Warehouse Management", "Putaway"],
  transfers: ["Warehouse Management", "Store Transfers"],
  "wh-approvals": ["Warehouse Management", "Request Approvals"],
  "wh-transfer": ["Warehouse Management", "Warehouse Transfers"],
  "wh-transfer-approve": ["Warehouse Management", "Transfer Approvals"],
  "wh-audit": ["Warehouse Management", "Warehouse Audit"],
  "wh-users": ["Warehouse Management", "Warehouse Users"],
  "wh-create": ["Warehouse Management", "Warehouses"],
  "wh-products": ["Warehouse Management", "Warehouse Products"],
  stores: ["Dark Stores", "Store Directory"],
  "store-inv": ["Dark Stores", "Store Inventory"],
  "ds-overview": ["Dark Stores", "Dark Store Network"],
  "ds-users": ["Dark Stores", "Store Users"],
  "ds-products": ["Dark Stores", "Store Products"],
  "ds-request": ["Dark Stores", "Goods Requests"],
  "ds-receive": ["Dark Stores", "Inbound to Store"],
  "ds-audit": ["Dark Stores", "Store Stock Audit"],
  picking: ["Order Management", "Picking"],
  bags: ["Order Management", "Bags & Packing"],
  racks: ["Dark Stores", "Staging Racks"],
  "scan-history": ["Dark Stores", "Barcode Scan Activity"],
  scanner: ["Monitoring", "Scanner Operations"],
  catalog: ["Catalog & Content", "Products"],
  promotions: ["Catalog & Content", "Promotions"],
  categories: ["Catalog & Content", "Categories"],
  mastersheet: ["Catalog & Content", "Master Sheet"],
  "rider-approvals": ["Workforce", "Rider Approvals"],
  "picker-approvals": ["Workforce", "Picker Approvals"],
  "rider-dir": ["Workforce", "Rider Directory"],
  "picker-dir": ["Workforce", "Picker Directory"],
  "rider-earn": ["Workforce", "Rider Earnings"],
  "picker-earn": ["Workforce", "Picker Earnings"],
  "earn-rules": ["Workforce", "Earning Rules"],
  payouts: ["Workforce", "Weekly Payout Runs"],
  shifts: ["Workforce", "Shift Templates"],
  roster: ["Workforce", "Roster & Assignment"],
  "rider-support": ["Workforce", "Rider Support"],
  "picker-support": ["Workforce", "Picker Support"],
  cms: ["Catalog & Content", "Content Pipeline"],
  "cms-home": ["Catalog & Content", "Home Page Builder"],
  "cms-media": ["Catalog & Content", "Media Library"],
  "cms-cal": ["Catalog & Content", "Content Calendar"],
  vendors: ["Warehouse Management", "Vendors"],
  riders: ["Delivery", "Riders & Live"],
  deliveries: ["Delivery", "Live Deliveries"],
  zones: ["Delivery", "Zones & Maps"],
  "bulk-orders": ["Delivery", "Bulk Orders"],
  "bd-overview": ["Delivery", "Bulk Delivery Board"],
  "bd-queue": ["Delivery", "Bulk Order Queue"],
  "bd-batches": ["Delivery", "Delivery Batches"],
  "bd-stops": ["Delivery", "Run Sheet & Stops"],
  "bd-route": ["Delivery", "Route Planning"],
  "bd-track": ["Delivery", "Live Vehicle Tracking"],
  "bd-ops": ["Delivery", "Vehicle Operators"],
  "bd-exceptions": ["Delivery", "Delivery Exceptions"],
  "bulk-dispatch": ["Delivery", "Load Planning"],
  "bulk-track": ["Delivery", "Consignment Tracking"],
  vehicles: ["Delivery", "Delivery Fleet"],
  "stall-overview": ["Container Stalls", "Network Overview"],
  "stall-areas": ["Container Stalls", "Areas & Dark Store Mapping"],
  stalls: ["Container Stalls", "Stall Directory"],
  "stall-staff": ["Container Stalls", "Stall Employees"],
  "stall-conv": ["Container Stalls", "Customer Conversions"],
  "stall-orders": ["Container Stalls", "Orders Generated"],
  "stall-ads": ["Container Stalls", "Advertisements"],
  "stall-samples": ["Container Stalls", "Product Samples"],
  "stall-incentives": ["Container Stalls", "Incentive Rules"],
  "stall-earnings": ["Container Stalls", "Employee Earnings"],
  customers: ["Customers", "Customers"],
  payments: ["Customers", "Payments & Finance"],
  support: ["Customers", "Support"],
  barcodes: ["Monitoring", "Barcode Registry"],
  reports: ["Analytics", "All Reports"],
  notifications: ["Monitoring", "Alerts"],
  account: ["Account", "Account Settings"],
  "rpt-overall": ["Analytics", "Overall Report"],
  "rpt-sales": ["Analytics", "Sales Report"],
  "rpt-ops": ["Analytics", "Operations Report"],
  "rpt-people": ["Analytics", "Employee Report"],
  "rpt-customer": ["Analytics", "Customer Report"],
  users: ["System", "Users"],
  roles: ["System", "Roles & Permissions"],
  audit: ["System", "Audit Logs"],
  settings: ["System", "Settings"],
  integrations: ["System", "Integrations"],
  "api-catalog": ["System", "API catalog"],
};
