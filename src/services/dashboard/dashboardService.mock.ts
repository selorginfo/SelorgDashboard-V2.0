import { mockDelay } from "@/services/mockDb";
import type { DashboardSnapshot } from "@/modules/dashboard/types";
import type { DashboardService } from "@/services/dashboard/dashboardService";

/** Adapted verbatim from the approved design's dashboard data (dc.html ~8850-8904). */
const SNAPSHOT: DashboardSnapshot = {
  heroKpis: [
    { label: "Orders today", value: "1,482", delta: "+12.4% vs yesterday", deltaColor: "var(--brand)", icon: "orders" },
    { label: "Revenue today", value: "₹9.84L", delta: "+8.1% vs yesterday", deltaColor: "var(--brand)", icon: "revenue" },
    { label: "Active orders", value: "142", delta: "38 in picking · 21 packing", deltaColor: "var(--mu)", icon: "active" },
    { label: "SLA on-time", value: "94.2%", delta: "−1.8% vs target 96%", deltaColor: "var(--red-tx)", icon: "sla" },
  ],
  opsKpis: [
    { label: "Pending picking", value: "38" },
    { label: "Pending packing", value: "21" },
    { label: "Ready for dispatch", value: "17" },
    { label: "Active deliveries", value: "66" },
    { label: "Cancelled today", value: "23", color: "var(--red-tx)" },
    { label: "Refunds pending", value: "9", color: "var(--amber-tx)" },
    { label: "Bags being picked", value: "38" },
    { label: "Awaiting rack placement", value: "21", color: "var(--amber-tx)" },
    { label: "Bags racked", value: "112" },
    { label: "Orders ready for rider", value: "17" },
    { label: "Product scan success", value: "99.6%" },
    { label: "Barcode exceptions", value: "6", color: "var(--red-tx)" },
  ],
  hourly: [
    { hour: "09", heightPct: 42, pendingPct: 0 },
    { hour: "10", heightPct: 58, pendingPct: 0 },
    { hour: "11", heightPct: 71, pendingPct: 0 },
    { hour: "12", heightPct: 88, pendingPct: 0 },
    { hour: "13", heightPct: 96, pendingPct: 0 },
    { hour: "14", heightPct: 74, pendingPct: 0 },
    { hour: "15", heightPct: 61, pendingPct: 0 },
    { hour: "16", heightPct: 69, pendingPct: 0 },
    { hour: "17", heightPct: 82, pendingPct: 12 },
    { hour: "18", heightPct: 94, pendingPct: 26 },
    { hour: "19", heightPct: 100, pendingPct: 44 },
    { hour: "20", heightPct: 78, pendingPct: 62 },
  ],
  alerts: [
    { id: "a1", title: "SLA breach — 3 orders", detail: "DS-02 Koramangala · picking stalled 14 min", color: "var(--red-tx)", ago: "2m", linkTo: "/exceptions" },
    { id: "a2", title: "Transfer TR-2291 delayed", detail: "WH-01 → DS-04 Whitefield · ETA missed by 40 min", color: "var(--amber-tx)", ago: "11m", linkTo: "/transfers" },
    { id: "a3", title: "Receiving discrepancy", detail: "GRN-8841 · 12 units short on SKU SEL-2214", color: "var(--amber-tx)", ago: "26m", linkTo: "/inbound" },
    { id: "a4", title: "Scanner offline", detail: "HSD-07 · DS-03 HSR Layout · last sync 08:12", color: "var(--red-tx)", ago: "38m", linkTo: "/scanner" },
    { id: "a5", title: "Out-of-stock SKUs", detail: "9 SKUs across 3 dark stores need replenishment", color: "#8a5cd6", ago: "1h", linkTo: "/store-inv" },
  ],
  storeRows: [
    { name: "DS-01 Indiranagar", city: "Bengaluru", orders: 386, pick: 9, pack: 4, sla: "97%", slaColor: "var(--brand)", status: "Open", badgeTone: "green" },
    { name: "DS-02 Koramangala", city: "Bengaluru", orders: 421, pick: 14, pack: 8, sla: "89%", slaColor: "var(--red-tx)", status: "At risk", badgeTone: "red" },
    { name: "DS-03 HSR Layout", city: "Bengaluru", orders: 298, pick: 7, pack: 5, sla: "95%", slaColor: "var(--brand)", status: "Open", badgeTone: "green" },
    { name: "DS-04 Whitefield", city: "Bengaluru", orders: 244, pick: 6, pack: 3, sla: "92%", slaColor: "var(--amber-tx)", status: "Low stock", badgeTone: "amber" },
    { name: "DS-05 Jayanagar", city: "Bengaluru", orders: 133, pick: 2, pack: 1, sla: "98%", slaColor: "var(--brand)", status: "Open", badgeTone: "green" },
  ],
  supply: [
    { value: "128K", label: "Warehouse stock (units)" },
    { value: "42", label: "Low stock SKUs", color: "var(--amber-tx)" },
    { value: "9", label: "Pending transfer requests" },
    { value: "5", label: "Transfers in transit" },
    { value: "3", label: "Awaiting receiving" },
    { value: "9", label: "Out-of-stock SKUs", color: "var(--red-tx)" },
  ],
  delivery: [
    { label: "Riders online", value: "48", pct: 80, color: "var(--brand)" },
    { label: "On delivery", value: "31", pct: 52, color: "#3b7fc4" },
    { label: "Idle / available", value: "17", pct: 28, color: "#8a5cd6" },
    { label: "Delayed deliveries", value: "6", pct: 12, color: "var(--red-tx)" },
    { label: "Unassigned orders", value: "4", pct: 8, color: "var(--amber-tx)" },
  ],
};

export const mockDashboardService: DashboardService = {
  async getSnapshot(_range) {
    await mockDelay();
    return SNAPSHOT;
  },
};
