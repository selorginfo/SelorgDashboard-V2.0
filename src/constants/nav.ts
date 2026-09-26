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
  | "rider-details"
  | "picker-details"
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
  | "cod-collection"
  | "order-progress"
  | "customer-reviews"
  | "hsd-devices"
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
    label: "Orders",
    items: [
      { id: "orders", label: "Orders", defaultCount: "142" },
      { id: "order-progress", label: "Order Progress" },
      { id: "bags", label: "Bags & Packing", defaultCount: "38" },
      { id: "exceptions", label: "Exception Centre" },
      { id: "cod-collection", label: "COD Collection" },
      { id: "returns", label: "Returns & Refunds" },
    ],
    roles: [
      "Super Admin",
      "Operations Admin",
      "Dark Store Manager",
      "Customer Support",
      "Warehouse Manager",
      "Finance Admin",
    ],
  },
  {
    label: "Rider",
    items: [
      { id: "riders", label: "Riders & Live" },
      { id: "deliveries", label: "Live Deliveries" },
      { id: "rider-approvals", label: "Rider Approvals" },
      { id: "rider-dir", label: "Rider Directory" },
      { id: "rider-details", label: "Rider Details" },
      { id: "rider-earn", label: "Rider Earnings" },
      { id: "rider-support", label: "Rider Support" },
      { id: "zones", label: "Zones & Maps" },
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
    label: "Picker",
    items: [
      { id: "picking", label: "Picking", defaultCount: "23" },
      { id: "picker-approvals", label: "Picker Approvals" },
      { id: "picker-dir", label: "Picker Directory" },
      { id: "picker-details", label: "Picker Details" },
      { id: "picker-earn", label: "Picker Earnings" },
      { id: "picker-support", label: "Picker Support" },
      { id: "hsd-devices", label: "HSD Devices" },
      { id: "racks", label: "Staging Racks" },
    ],
    roles: [
      "Super Admin",
      "Operations Admin",
      "Dark Store Manager",
      "Finance Admin",
      "Customer Support",
      "Warehouse Manager",
    ],
  },
  {
    label: "Customers",
    items: [
      { id: "customers", label: "Customers" },
      { id: "support", label: "Support", defaultCount: "64" },
      { id: "payments", label: "Payments & Finance" },
      { id: "customer-reviews", label: "Customer Reviews" },
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
      { id: "stall-areas", label: "Areas & Mapping" },
      { id: "stalls", label: "Stall Directory" },
      { id: "stall-staff", label: "Stall Employees" },
      { id: "stall-conv", label: "Customer Conversions" },
      { id: "stall-orders", label: "Stall Orders" },
      { id: "stall-ads", label: "Advertisements" },
      { id: "stall-samples", label: "Product Samples" },
      { id: "stall-incentives", label: "Incentive Rules" },
      { id: "stall-earnings", label: "Employee Earnings" },
    ],
    roles: ["Super Admin", "Operations Admin", "Catalog Manager", "Finance Admin"],
  },
  /**
   * Bulk / B2B delivery ops. Live rider delivery lives under the Rider module.
   */
  {
    label: "Bulk Delivery",
    items: [
      { id: "bd-overview", label: "Bulk Delivery Board" },
      { id: "bd-queue", label: "Bulk Order Queue" },
      { id: "bulk-orders", label: "Bulk Orders" },
      { id: "bd-batches", label: "Delivery Batches" },
      { id: "bulk-dispatch", label: "Load Planning" },
      { id: "bd-stops", label: "Run Sheet & Stops" },
      { id: "bd-route", label: "Route Planning" },
      { id: "bd-track", label: "Live Vehicle Tracking" },
      { id: "bulk-track", label: "Consignment Tracking" },
      { id: "bd-ops", label: "Vehicle Operators" },
      { id: "bd-exceptions", label: "Delivery Exceptions" },
      { id: "vehicles", label: "Delivery Fleet" },
    ],
    roles: ["Super Admin", "Operations Admin", "Rider Manager"],
  },
  {
    label: "Workforce",
    items: [
      { id: "earn-rules", label: "Earning Rules" },
      { id: "payouts", label: "Weekly Payout Runs" },
      { id: "shifts", label: "Shift Templates" },
      { id: "roster", label: "Roster & Assignment" },
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
      { id: "scanner", label: "Scanner Operations" },
      { id: "barcodes", label: "Barcode Registry" },
      { id: "notifications", label: "Alerts" },
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
  exceptions: ["Orders", "Exception Centre"],
  returns: ["Orders", "Returns & Refunds"],
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
  picking: ["Picker", "Picking"],
  bags: ["Orders", "Bags & Packing"],
  racks: ["Picker", "Staging Racks"],
  "scan-history": ["Dark Stores", "Barcode Scan Activity"],
  scanner: ["Monitoring", "Scanner Operations"],
  catalog: ["Catalog & Content", "Products"],
  promotions: ["Catalog & Content", "Promotions"],
  categories: ["Catalog & Content", "Categories"],
  mastersheet: ["Catalog & Content", "Master Sheet"],
  "rider-approvals": ["Rider", "Rider Approvals"],
  "picker-approvals": ["Picker", "Picker Approvals"],
  "rider-dir": ["Rider", "Rider Directory"],
  "picker-dir": ["Picker", "Picker Directory"],
  "rider-details": ["Rider", "Rider Details"],
  "picker-details": ["Picker", "Picker Details"],
  "rider-earn": ["Rider", "Rider Earnings"],
  "picker-earn": ["Picker", "Picker Earnings"],
  "earn-rules": ["Workforce", "Earning Rules"],
  payouts: ["Workforce", "Weekly Payout Runs"],
  shifts: ["Workforce", "Shift Templates"],
  roster: ["Workforce", "Roster & Assignment"],
  "rider-support": ["Rider", "Rider Support"],
  "picker-support": ["Picker", "Picker Support"],
  cms: ["Catalog & Content", "Content Pipeline"],
  "cms-home": ["Catalog & Content", "Home Page Builder"],
  "cms-media": ["Catalog & Content", "Media Library"],
  "cms-cal": ["Catalog & Content", "Content Calendar"],
  vendors: ["Warehouse Management", "Vendors"],
  riders: ["Rider", "Riders & Live"],
  deliveries: ["Rider", "Live Deliveries"],
  zones: ["Rider", "Zones & Maps"],
  "bulk-orders": ["Bulk Delivery", "Bulk Orders"],
  "bd-overview": ["Bulk Delivery", "Bulk Delivery Board"],
  "bd-queue": ["Bulk Delivery", "Bulk Order Queue"],
  "bd-batches": ["Bulk Delivery", "Delivery Batches"],
  "bd-stops": ["Bulk Delivery", "Run Sheet & Stops"],
  "bd-route": ["Bulk Delivery", "Route Planning"],
  "bd-track": ["Bulk Delivery", "Live Vehicle Tracking"],
  "bd-ops": ["Bulk Delivery", "Vehicle Operators"],
  "bd-exceptions": ["Bulk Delivery", "Delivery Exceptions"],
  "bulk-dispatch": ["Bulk Delivery", "Load Planning"],
  "bulk-track": ["Bulk Delivery", "Consignment Tracking"],
  vehicles: ["Bulk Delivery", "Delivery Fleet"],
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
  "cod-collection": ["Orders", "COD Collection"],
  "order-progress": ["Orders", "Order Progress"],
  "customer-reviews": ["Customers", "Customer Reviews"],
  "hsd-devices": ["Picker", "HSD Devices"],
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
  audit: ["Monitoring", "Audit Logs"],
  settings: ["System", "Settings"],
  integrations: ["System", "Integrations"],
  "api-catalog": ["System", "API catalog"],
};
