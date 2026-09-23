import type { ReportCatalogItem } from "@/types/system";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Transcribed from REPORTS_CONFIGS.reports' 6 tabs (workspace/data/reports.ts:291-317) — the
 * "All Reports" catalog index, not the 5 rpt-* detail pages (out of scope, stay generic tables).
 * Read-only — "Generate" / "Download" just toast a confirmation, nothing to persist. */
export const SEED_REPORT_CATALOG: ReportCatalogItem[] = [
  { id: "rep-order-throughput", name: "Order throughput", scope: "All stores", period: "Today", metric: "1,482 orders", change: "+12.4%", owner: "Ops", format: "CSV / PDF", status: s("Ready", "green"), tab: "Operations" },
  { id: "rep-sla-breach", name: "SLA breach analysis", scope: "All stores", period: "7 days", metric: "5.8% breach", change: "+1.8%", owner: "Ops", format: "CSV", status: s("Ready", "green"), tab: "Operations" },
  { id: "rep-pick-pack-time", name: "Picking & packing time", scope: "All stores", period: "7 days", metric: "4.2 / 2.1 min", change: "−0.3 min", owner: "Ops", format: "CSV", status: s("Ready", "green"), tab: "Operations" },

  { id: "rep-transfer-volume", name: "Transfer volume", scope: "WH-01 → DS", period: "30 days", metric: "42,180 units", change: "+8.2%", owner: "Warehouse", format: "CSV", status: s("Ready", "green"), tab: "Supply chain" },
  { id: "rep-transfer-discrepancy", name: "Transfer discrepancy", scope: "WH-01 → DS", period: "30 days", metric: "0.6% units", change: "−0.2%", owner: "Warehouse", format: "CSV", status: s("Ready", "green"), tab: "Supply chain" },
  { id: "rep-replenishment-lead-time", name: "Replenishment lead time", scope: "WH-01 → DS", period: "30 days", metric: "6.4 h", change: "−0.8 h", owner: "Warehouse", format: "CSV", status: s("Ready", "green"), tab: "Supply chain" },

  { id: "rep-revenue", name: "Revenue", scope: "All stores", period: "Today", metric: "₹9.84L", change: "+8.1%", owner: "Finance", format: "CSV / PDF", status: s("Ready", "green"), tab: "Sales" },
  { id: "rep-products-sold", name: "Products sold", scope: "All stores", period: "Today", metric: "18,410 units", change: "+9.4%", owner: "Catalog", format: "CSV", status: s("Ready", "green"), tab: "Sales" },

  { id: "rep-stockouts", name: "Stockouts", scope: "All stores", period: "7 days", metric: "9 SKUs", change: "−3", owner: "Warehouse", format: "CSV", status: s("Ready", "green"), tab: "Inventory" },
  { id: "rep-wastage-expiry", name: "Wastage & expiry", scope: "All locations", period: "30 days", metric: "₹64K", change: "+₹8K", owner: "Warehouse", format: "CSV", status: s("Review", "amber"), tab: "Inventory" },

  { id: "rep-deliveries-on-time", name: "Deliveries & on-time", scope: "All hubs", period: "7 days", metric: "96.1% on-time", change: "+0.4%", owner: "Delivery", format: "CSV", status: s("Ready", "green"), tab: "Rider" },
  { id: "rep-rider-utilisation", name: "Rider utilisation", scope: "All hubs", period: "7 days", metric: "72%", change: "+3%", owner: "Delivery", format: "CSV", status: s("Ready", "green"), tab: "Rider" },

  { id: "rep-cod-reconciliation", name: "COD reconciliation", scope: "All hubs", period: "Today", metric: "₹3.42L", change: "—", owner: "Finance", format: "CSV", status: s("Open", "amber"), tab: "Finance" },
  { id: "rep-refunds-failures", name: "Refunds & failures", scope: "All stores", period: "30 days", metric: "₹8.2L / 412", change: "−4%", owner: "Finance", format: "CSV / PDF", status: s("Ready", "green"), tab: "Finance" },
];
