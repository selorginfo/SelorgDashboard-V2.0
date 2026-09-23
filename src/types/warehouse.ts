import type { Badge } from "@/types/common";

/** A single rack within a warehouse zone (hierarchy layout, `wh`). */
export interface WhRack {
  id: string;
  bins: number;
  used: number;
  skus: number;
  note: string;
}

/** A warehouse zone — Zone A–D plus Quarantine — each holding a handful of racks. */
export interface WhZone {
  zone: string;
  desc: string;
  cap: number;
  used: number;
  racks: WhRack[];
}

/** One occupied bin's contents, shown in the rack detail bin grid. */
export interface BinItem {
  sku: string;
  name: string;
  batch: string;
  expiry: string;
  qty: string;
  status: string;
}

/** SKU-level stock row for the `wh-inv` inventory layout. */
export interface WhInventoryRow {
  id: string;
  tab: string;
  sku: string;
  product: string;
  batch: string;
  expiry: string;
  available: string;
  reserved: string;
  location: string;
  status: Badge;
}

/** A goods receipt (GRN) in the `inbound` receiving queue. */
export interface Grn {
  id: string;
  supplier: string;
  sku: string;
  expected: string;
  received: string;
  accepted: string;
  rejected: string;
  status: Badge;
}

/** One line item within a GRN's detail (from RECEIVE_LINES). */
export interface ReceiveLine {
  sku: string;
  name: string;
  batch: string;
  expected: number;
  received: number;
  accepted: number;
  rejected: number;
}

/** A putaway task in the `putaway` assign layout — queued or confirmed. */
export interface PutawayTask {
  id: string;
  grn: string;
  sku: string;
  quantity: string;
  batch: string;
  suggested: string;
  assigned: string;
  status: Badge;
}

/** A warehouse → dark store stock transfer, shown as a kanban card in `transfers`. */
export interface Transfer {
  id: string;
  toStore: string;
  priority: string;
  requested: string;
  approved: string;
  dispatched: string;
  received: string;
  status: Badge;
}

/** One line item in a WD transfer request. */
export interface WDTransferItem {
  product_id?: string;
  product_name: string;
  sku: string;
  requested_qty: number;
  approved_qty: number;
  packed_qty: number;
  received_qty: number;
}

/** One action log entry for a WD transfer request. */
export interface WDTransferLog {
  _id: string;
  transfer_id: string;
  action: "created" | "accepted" | "rejected" | "packed" | "dispatched" | "received" | "completed";
  performed_by: string;
  note?: string;
  createdAt: string;
}

/** Full Warehouse → Darkstore transfer request from the API. */
export interface WDTransferRequest {
  _id: string;
  transfer_id: string;
  warehouse_id: string;
  dark_store_id: string;
  status: "pending" | "accepted" | "rejected" | "packed" | "dispatched" | "completed";
  items: WDTransferItem[];
  requested_by: string;
  accepted_by?: string;
  dispatch_date?: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_no?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
