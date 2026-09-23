import type { ModuleId } from "@/constants/nav";

/**
 * Static list of module ids served by the shared Workspace template — mirrors the keys of
 * WORKSPACE_CONFIGS (workspaceData.ts) without importing that data eagerly. The router needs
 * this list to build routes at startup; the actual config data should only load when a
 * lazy-loaded WorkspaceModulePage chunk is visited, not bundled into the app shell.
 *
 * `wh`, `wh-inv`, `inbound`, `putaway`, `transfers`, `picking`, `bags`, `racks`, `store-inv`,
 * `stores`, `catalog`, `customers`, `support`, `promotions`, `rider-dir`, `picker-dir`,
 * `rider-earn`, `picker-earn`, `payouts`, `shifts`, `roster`, `exceptions`, `scanner`,
 * `scan-history`, `audit`, `users`, `settings` and `reports` are deliberately omitted — each now
 * has its own bespoke module (src/modules/warehouse, src/modules/darkstore, src/modules/catalog,
 * src/modules/commerce, src/modules/workforce, src/modules/monitoring, src/modules/system)
 * matching the approved design's distinct per-route layout, so the generic table route is no
 * longer registered for them. The 5 rpt-* Analytics pages are served by bespoke
 * AnalyticsReportPage (src/modules/analytics) wired to live /admin/analytics APIs.
 *
 * `ds-request`, `ds-receive`, `ds-audit` and `wh-approvals` are omitted too — they are served by
 * bespoke pages that call the real darkstore / transfer / audit APIs.
 *
 * `inbound-asn`, `wh-transfer`, `wh-transfer-approve` and `wh-audit` are omitted for the same
 * reason — ExpectedStockPage / WarehouseTransfersPage / TransferApprovalsPage / WarehouseAuditPage.
 *
 * `bulk-orders` is omitted — served by the bespoke BulkOrdersPage (src/modules/bulkOrders). The
 * Delivery and Container Stalls screens (deliveries, bd-*, vehicles, bulk-dispatch, bulk-track,
 * stall-*) are served by the design-driven OpsModulePage (src/modules/ops).
 */
export const WORKSPACE_MODULE_IDS: ModuleId[] = [
  "payments",
  "returns",
  "zones",
];
