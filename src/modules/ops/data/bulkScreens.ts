import { BULK_ORDERS_CONFIGS } from "@/services/workspace/data/bulkorders";
import type { OpsScreenDef } from "@/modules/ops/types";

/**
 * Load Planning and Consignment Tracking already existed in the frontend (B2B bulk orders) but are
 * not in the design's SCREENS map. They now sit inside Delivery beside the design's bulk-delivery
 * screens, so they get the same engine: rows and KPIs are the existing ones, and the flow, actions
 * and forms reuse the design's vocabulary (Match vehicle, Dispatch load, Notify customer, …).
 */
const dispatch = BULK_ORDERS_CONFIGS["bulk-dispatch"]!;
const track = BULK_ORDERS_CONFIGS["bulk-track"]!;

export const BULK_SCREENS: Record<string, OpsScreenDef> = {
  "bulk-dispatch": {
    id: "bulk-dispatch",
    group: "Delivery",
    title: "Load Planning",
    hint: dispatch.hint,
    flow: [
      { label: "Load planned", actor: "Dispatch" },
      { label: "Vehicle matched", actor: "Dispatch" },
      { label: "Driver assigned", actor: "Fleet ops" },
      { label: "Loading", actor: "Warehouse" },
      { label: "Dispatched", actor: "Driver" },
      { label: "Delivered", actor: "Driver" },
    ],
    flowAt: 2,
    kpis: dispatch.kpis,
    tabs: dispatch.tabs,
    columns: dispatch.columns,
    rows: dispatch.rows,
    layout: "consignment",
    detail: "lifecycle",
    purpose: [
      "Dispatch coordinator",
      "match each B2B load to a vehicle and driver that can carry it",
      "Dispatching a load hands it to Consignment Tracking until the client confirms delivery.",
    ],
    actions: ["Match vehicle", "Assign driver", "Split into trips", "Dispatch load"],
    bulk: [{ label: "Match vehicle" }, { label: "Dispatch load" }, { label: "Export view" }],
    entity: "Load plan",
    cap: "cu",
    links: [
      { label: "Vehicle", col: 1, route: "vehicles" },
      { label: "Consignment", text: "Tracking", route: "bulk-track" },
      { label: "Bulk orders", text: "B2B orders", route: "bulk-orders" },
    ],
  },
  "bulk-track": {
    id: "bulk-track",
    group: "Delivery",
    title: "Consignment Tracking",
    hint: track.hint,
    flow: [
      { label: "Scheduled", actor: "Dispatch" },
      { label: "Loading", actor: "Warehouse" },
      { label: "In transit", actor: "Driver" },
      { label: "Out for delivery", actor: "Driver" },
      { label: "Delivered", actor: "Driver" },
      { label: "Confirmed by client", actor: "Client" },
    ],
    flowAt: 2,
    kpis: track.kpis,
    tabs: track.tabs,
    columns: track.columns,
    rows: track.rows,
    layout: "dispatch",
    detail: "trace",
    purpose: [
      "Dispatch and account managers",
      "know where every B2B consignment is and warn the client before it runs late",
      "A delayed consignment is flagged to the client; delivery confirmation closes it.",
    ],
    actions: ["Track live", "Call operator", "Notify customer", "Mark delivered", "Close trip"],
    bulk: [{ label: "Notify customer" }, { label: "Export view" }],
    entity: "Consignment",
    cap: "u",
    links: [
      { label: "Vehicle", col: 4, route: "vehicles" },
      { label: "Load plan", text: "Load planning", route: "bulk-dispatch" },
      { label: "Bulk orders", text: "B2B orders", route: "bulk-orders" },
    ],
  },
};
