import type { ModuleId } from "@/constants/nav";

/**
 * Routes served by OpsModulePage — mirrors the keys of OPS_SCREENS (screens.ts) without importing
 * the generated screen data, so the router can register routes at startup while the data only
 * loads with the lazy page chunk. routeIds.test.ts keeps the two in sync.
 */
export const OPS_ROUTE_IDS: ModuleId[] = [
  "deliveries",
  "bd-overview",
  "bd-queue",
  "bd-batches",
  "bd-stops",
  "bd-route",
  "bd-track",
  "bd-ops",
  "bd-exceptions",
  "vehicles",
  "bulk-dispatch",
  "bulk-track",
  "stall-overview",
  "stall-areas",
  "stalls",
  "stall-staff",
  "stall-conv",
  "stall-orders",
  "stall-ads",
  "stall-samples",
  "stall-incentives",
  "stall-earnings",
];
