/**
 * Inventory of Admin Dashboard frontend → backend API mappings
 * extracted from src/services/** and module hooks (real paths only).
 */
export type InventoryEndpoint = {
  feature: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  auth: boolean;
  service: string;
  /** Safe for automation without mutating production data. */
  safeRead?: boolean;
};

export const ADMIN_API_INVENTORY: InventoryEndpoint[] = [
  // Auth
  { feature: "Auth", method: "POST", path: "/api/v1/admin/auth/login", auth: false, service: "authService.real" },
  { feature: "Auth", method: "POST", path: "/api/v1/admin/auth/logout", auth: true, service: "sessionStore / auth" },

  // Dashboard
  { feature: "Dashboard", method: "GET", path: "/api/v1/admin/analytics/realtime", auth: true, service: "dashboardService.real", safeRead: true },
  { feature: "Promotions analytics", method: "GET", path: "/api/v1/admin/analytics/revenue", auth: true, service: "promotionsService.real", safeRead: true },

  // Orders
  { feature: "Orders", method: "GET", path: "/api/v1/admin/orders", auth: true, service: "orderService.real", safeRead: true },
  { feature: "Orders", method: "GET", path: "/api/v1/admin/orders/:id", auth: true, service: "orderService.real", safeRead: true },
  { feature: "Orders", method: "GET", path: "/api/v1/admin/orders/:id/logs", auth: true, service: "orderService.real", safeRead: true },
  { feature: "Orders", method: "PUT", path: "/api/v1/admin/orders/:id/update-status", auth: true, service: "orderService.real" },
  { feature: "Orders", method: "POST", path: "/api/v1/admin/orders", auth: true, service: "orderService.real" },
  { feature: "Picking", method: "POST", path: "/api/v1/admin/orders/:id/reassign-picker", auth: true, service: "pickingService.real" },

  // Catalog / products
  { feature: "Catalog", method: "GET", path: "/api/v1/admin/products", auth: true, service: "catalogService.real", safeRead: true },
  { feature: "Catalog", method: "GET", path: "/api/v1/admin/products/:id", auth: true, service: "catalogService.real", safeRead: true },
  { feature: "Catalog", method: "POST", path: "/api/v1/admin/products", auth: true, service: "catalogService.real" },
  { feature: "Catalog", method: "PUT", path: "/api/v1/admin/products/:id", auth: true, service: "catalogService.real" },
  { feature: "Catalog", method: "DELETE", path: "/api/v1/admin/products/:id", auth: true, service: "catalogService.real" },
  { feature: "Catalog", method: "POST", path: "/api/v1/admin/products/bulk-upload", auth: true, service: "catalogService.real" },
  { feature: "Catalog", method: "POST", path: "/api/v1/admin/products/upload-image", auth: true, service: "productImageService" },
  { feature: "Mastersheet", method: "GET", path: "/api/v1/admin/mastersheet/history", auth: true, service: "mastersheetService", safeRead: true },
  { feature: "Mastersheet", method: "GET", path: "/api/v1/admin/mastersheet/template", auth: true, service: "mastersheetService", safeRead: true },
  { feature: "Mastersheet", method: "POST", path: "/api/v1/admin/mastersheet/prepare", auth: true, service: "mastersheetService" },

  // Categories (customer admin namespace)
  { feature: "Categories", method: "GET", path: "/api/v1/customer/admin/categories/all", auth: true, service: "categoryService.real", safeRead: true },
  { feature: "Categories", method: "POST", path: "/api/v1/customer/admin/categories", auth: true, service: "categoryService.real" },
  { feature: "Categories", method: "PUT", path: "/api/v1/customer/admin/categories/:id", auth: true, service: "categoryService.real" },
  { feature: "Categories", method: "DELETE", path: "/api/v1/customer/admin/categories/:id", auth: true, service: "categoryService.real" },

  // Promotions / CMS
  { feature: "Promotions", method: "GET", path: "/api/v1/customer/admin/coupons", auth: true, service: "promotionsService.real", safeRead: true },
  { feature: "Banners", method: "GET", path: "/api/v1/customer/banners", auth: true, service: "promotionsService.real", safeRead: true },
  { feature: "CMS", method: "GET", path: "/api/v1/customer/admin/cms/pages", auth: true, service: "contentService.real", safeRead: true },
  { feature: "CMS", method: "GET", path: "/api/v1/customer/admin/cms/media", auth: true, service: "mediaService.real", safeRead: true },
  { feature: "CMS Home", method: "GET", path: "/api/v1/customer/admin/home/sections", auth: true, service: "homeSectionService.real", safeRead: true },

  // Dark stores / inventory
  { feature: "Darkstores", method: "GET", path: "/api/v1/admin/darkstores", auth: true, service: "useStores", safeRead: true },
  { feature: "Darkstore users", method: "GET", path: "/api/v1/admin/darkstore-users", auth: true, service: "darkStoreUsersService", safeRead: true },
  { feature: "Store inventory", method: "GET", path: "/api/v1/admin/store-warehouse/inventories", auth: true, service: "darkStoreInventoryService", safeRead: true },
  { feature: "Racks", method: "GET", path: "/api/v1/darkstore/inventory/shelves", auth: true, service: "useRacks", safeRead: true },
  { feature: "Stock levels", method: "GET", path: "/api/v1/darkstore/inventory/stock-levels", auth: true, service: "useStoreInventory", safeRead: true },
  { feature: "Bags", method: "GET", path: "/api/v1/darkstore/packing/queue", auth: true, service: "bagsService.real", safeRead: true },
  { feature: "Bags", method: "PATCH", path: "/api/v1/darkstore/orders/:id/bag-rack", auth: true, service: "bagsService.real" },
  { feature: "Putaway", method: "GET", path: "/api/v1/darkstore/inbound/putaway", auth: true, service: "putawayService.real", safeRead: true },
  { feature: "DS transfers", method: "GET", path: "/api/v1/darkstore/transfer-requests", auth: true, service: "wdTransferService", safeRead: true },
  { feature: "Scan history", method: "GET", path: "/api/v1/darkstore/utilities/audit-logs", auth: true, service: "useScanHistory", safeRead: true },
  { feature: "HSD fleet", method: "GET", path: "/api/v1/darkstore/hsd/fleet", auth: true, service: "useScanner", safeRead: true },
  { feature: "HSD logs", method: "GET", path: "/api/v1/darkstore/hsd/logs", auth: true, service: "useScanner", safeRead: true },
  { feature: "Reports export", method: "POST", path: "/api/v1/darkstore/reports/export", auth: true, service: "ReportsCatalogPage" },

  // Warehouse
  { feature: "Warehouses", method: "GET", path: "/api/v1/admin/warehouses", auth: true, service: "warehouseCreateService", safeRead: true },
  { feature: "WH users", method: "GET", path: "/api/v1/admin/warehouse-users", auth: true, service: "warehouseUsersService", safeRead: true },
  { feature: "WH inventory", method: "GET", path: "/api/v1/admin/store-warehouse/warehouse-inventory", auth: true, service: "warehouseInventoryService", safeRead: true },
  { feature: "Zones", method: "GET", path: "/api/v1/warehouse/utilities/zones", auth: true, service: "fetchWarehouseZones", safeRead: true },
  { feature: "GRN", method: "GET", path: "/api/v1/warehouse/inbound/grns", auth: true, service: "grnService.real", safeRead: true },
  { feature: "QC", method: "GET", path: "/api/v1/warehouse/qc/inspections", auth: true, service: "grnService.real", safeRead: true },
  { feature: "Transfers", method: "GET", path: "/api/v1/warehouse/transfers", auth: true, service: "transferService.real", safeRead: true },
  { feature: "WH DS requests", method: "GET", path: "/api/v1/warehouse/darkstore-requests", auth: true, service: "wdTransferService", safeRead: true },
  { feature: "Shifts", method: "GET", path: "/api/v1/warehouse/staff/shifts", auth: true, service: "shiftsService.real", safeRead: true },

  // Riders / workforce
  { feature: "Riders live", method: "GET", path: "/api/v1/rider/dispatch/map/riders", auth: true, service: "ridersService.real", safeRead: true },
  { feature: "Riders directory", method: "GET", path: "/api/v1/admin/riders", auth: true, service: "ridersService / approvals / directory", safeRead: true },
  { feature: "Fleet summary", method: "GET", path: "/api/v1/rider/fleet/summary", auth: true, service: "ridersService.real", safeRead: true },
  { feature: "Live positions", method: "GET", path: "/api/v1/rider/live-positions", auth: true, service: "useLiveRiderPositions", safeRead: true },
  { feature: "Rider status", method: "PATCH", path: "/api/v1/admin/riders/:id/status", auth: true, service: "approvalService.real" },
  { feature: "Picker approvals", method: "GET", path: "/api/v1/admin/picker/approvals", auth: true, service: "approvalService.real", safeRead: true },
  { feature: "Picker directory", method: "GET", path: "/api/v1/admin/picker/pickers", auth: true, service: "directoryService.real", safeRead: true },
  { feature: "Shift changes", method: "GET", path: "/api/v1/admin/picker/shift-change-requests", auth: true, service: "rosterService.real", safeRead: true },

  // Finance / earnings
  { feature: "Rider payouts", method: "GET", path: "/api/v1/admin/finance/rider-cash/payouts", auth: true, service: "earningsService.real", safeRead: true },
  { feature: "Picker withdrawals", method: "GET", path: "/api/v1/admin/finance/picker-withdrawals", auth: true, service: "earningsService.real", safeRead: true },
  { feature: "Vendor payments", method: "GET", path: "/api/v1/admin/finance/vendor-payments/payments", auth: true, service: "payoutsService.real", safeRead: true },
  { feature: "Commission slabs", method: "GET", path: "/api/v1/admin/finance/config/commission-slabs", auth: true, service: "earningRuleService.real", safeRead: true },

  // Commerce / support / system
  { feature: "Customers", method: "GET", path: "/api/v1/admin/customers", auth: true, service: "customerService.real", safeRead: true },
  { feature: "Wallet credit", method: "POST", path: "/api/v1/admin/customers/:id/wallet/credit", auth: true, service: "customerService.real" },
  { feature: "Support tickets", method: "GET", path: "/api/v1/admin/support/tickets", auth: true, service: "cxTicketService / supportTicketService", safeRead: true },
  { feature: "Users", method: "GET", path: "/api/v1/admin/users", auth: true, service: "usersService.real", safeRead: true },
  { feature: "Roles", method: "GET", path: "/api/v1/admin/roles", auth: true, service: "rolesService.real", safeRead: true },
  { feature: "Settings", method: "GET", path: "/api/v1/admin/platform-config", auth: true, service: "settingsService.real", safeRead: true },
  { feature: "App settings", method: "GET", path: "/api/v1/admin/app-settings", auth: true, service: "notificationPrefsService.real", safeRead: true },
  { feature: "Fraud alerts", method: "GET", path: "/api/v1/admin/fraud/alerts", auth: true, service: "exceptionsService.real", safeRead: true },
  { feature: "Notifications templates", method: "GET", path: "/api/v1/admin/notifications/templates", auth: true, service: "notificationService.real", safeRead: true },
  { feature: "Notifications history", method: "GET", path: "/api/v1/admin/notifications/history", auth: true, service: "notificationService.real", safeRead: true },
  { feature: "Integrations", method: "GET", path: "/api/v1/admin/integrations/health", auth: true, service: "integrationService.real", safeRead: true },
  { feature: "Vendors", method: "GET", path: "/api/v1/admin/vendor/vendors", auth: true, service: "vendorService.real", safeRead: true },
  { feature: "Audit logs", method: "GET", path: "/api/v1/admin/audit/logs", auth: true, service: "useAuditLog", safeRead: true },
];

/** Safe GET endpoints for authenticated sweep (no path params). */
export const SAFE_AUTH_GETS = ADMIN_API_INVENTORY.filter(
  (e) => e.safeRead && e.method === "GET" && !e.path.includes(":"),
);
