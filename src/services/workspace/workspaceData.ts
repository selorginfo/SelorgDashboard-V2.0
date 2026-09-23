import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { REPORTS_CONFIGS } from "./data/reports";
import { WAREHOUSE_CONFIGS } from "./data/warehouse";
import { DARKSTORE_CONFIGS } from "./data/darkstores";
import { CATALOG_CONFIGS } from "./data/catalog";
import { COMMERCE_CONFIGS } from "./data/commerce";
import { WORKFORCE_CONFIGS } from "./data/workforce";
import { CMS_CONFIGS } from "./data/cms";
import { SYSTEM_CONFIGS } from "./data/system";

/**
 * Every route in the approved design whose `LAYOUT[route]` is "table" (the default) or a
 * card-style layout the design itself treats as a plain-list equivalent (dc.html ~7356-7359) —
 * see the plan's "Route → screen mapping" note. Routes with a genuinely distinct IA (Orders,
 * Riders live map, Categories, Approvals, Earning Rules, Roles matrix, Support consoles, CMS
 * Content Pipeline) have their own modules instead.
 *
 * `cms`, `cms-home`, `cms-media`, `cms-cal`, `integrations`, `notifications`, `vendors`, `wh`,
 * `wh-inv`, `inbound`, `putaway`, `transfers`, `picking`, `bags`, `racks`, `store-inv`,
 * `stores`, `catalog`, `customers`, `support`, `promotions`, `rider-dir`, `picker-dir`,
 * `rider-earn`, `picker-earn`, `payouts`, `shifts`, `roster`, `exceptions`, `scanner`,
 * `scan-history`, `audit`, `users`, `settings`, `reports` and the five `rpt-*` Analytics
 * pages are deliberately omitted below — each has its own bespoke module now (their seeds
 * reuse this same transcribed data, reshaped) and the plain table route is no longer registered
 * for them. `payments`, `returns` and `zones` stay on the generic template — out of scope for
 * the bespoke-module pass.
 *
 * `ds-request`, `ds-receive` and `wh-approvals` are omitted for the same reason: the
 * warehouse↔darkstore transfer flow (request → accept/reject → pack → dispatch → receive) is
 * served by DarkstoreTransferRequestsPage / DarkstoreReceivePage / DarkstoreRequestsPage, which
 * call the real transfer APIs. Leaving them here shadowed those pages with a static table.
 * `ds-overview` is omitted too — DarkStoreNetworkPage owns that route.
 */
function omit(config: Partial<Record<ModuleId, WorkspaceConfig>>, ids: ModuleId[]) {
  return Object.fromEntries(Object.entries(config).filter(([id]) => !ids.includes(id as ModuleId))) as Partial<
    Record<ModuleId, WorkspaceConfig>
  >;
}

export const WORKSPACE_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  ...omit(REPORTS_CONFIGS, ["reports", "rpt-overall", "rpt-sales", "rpt-ops", "rpt-people", "rpt-customer"]),
  ...omit(WAREHOUSE_CONFIGS, [
    "wh",
    "wh-inv",
    "inbound",
    "putaway",
    "transfers",
    "wh-approvals",
    "inbound-asn",
    "wh-transfer",
    "wh-transfer-approve",
    "wh-audit",
  ]),
  ...omit(DARKSTORE_CONFIGS, [
    "picking",
    "bags",
    "racks",
    "store-inv",
    "stores",
    "scanner",
    "scan-history",
    "ds-request",
    "ds-receive",
    "ds-overview",
    "ds-audit",
  ]),
  ...omit(CATALOG_CONFIGS, ["catalog"]),
  ...omit(COMMERCE_CONFIGS, ["customers", "support", "promotions"]),
  ...omit(WORKFORCE_CONFIGS, [
    "vendors",
    "rider-dir",
    "picker-dir",
    "rider-earn",
    "picker-earn",
    "payouts",
    "shifts",
    "roster",
  ]),
  ...omit(CMS_CONFIGS, ["cms", "cms-home", "cms-media", "cms-cal"]),
  ...omit(SYSTEM_CONFIGS, ["integrations", "notifications", "exceptions", "users", "audit", "settings"]),
};
