import type { Badge } from "@/types/common";

/** A queued or in-flight order in the `picking` progress layout — "Picking queue", "Packing" and
 * "Exceptions" tabs all share this shape (columns: Order, Store, Picker, Items, Picked, Started,
 * Elapsed, Status from workspace/data/darkstores.ts). */
export interface PickingOrder {
  id: string; // order id, e.g. SEL-104815
  store: string;
  picker: string;
  items: number;
  picked: number;
  started: string;
  elapsed: string;
  status: Badge;
  tab: "Picking queue" | "Packing" | "Exceptions";
  createdAt?: string; // ISO date-time from API, used for day-based client-side filtering
}

/** A picker's shift stats row — "Picker performance" tab, read-only. */
export interface PickerPerformance {
  picker: string;
  store: string;
  shift: string;
  orders: string;
  items: string;
  accuracy: string;
  avgTime: string;
  status: Badge;
}

/** A bag moving through the `bags` progress layout — "Bag queue", "Awaiting rack", "Racked" and
 * "Exceptions" tabs (columns: Bag, Barcode, Order, Dark store, Picker, Products scanned, Rack,
 * Status). */
export interface Bag {
  id: string; // bag id, e.g. BAG-000982
  barcode: string;
  order: string;
  store: string;
  picker: string;
  scanned: number;
  total: number;
  rack: string;
  status: Badge;
  tab: "Bag queue" | "Awaiting rack" | "Racked" | "Exceptions";
  createdAt?: string; // ISO date-time from API, used for day-based client-side filtering
}

/** A single staging rack — `racks` slots layout, "All racks" tab (columns: Rack, Barcode, Dark
 * store, Zone, Capacity, Occupied, Available, Status). Read-only. */
export interface DsRack {
  id: string;
  barcode: string;
  store: string;
  zone: string;
  capacity: number;
  occupied: number;
  available: number;
  status: Badge;
}

/** A dark store's rack rollup — `racks` "By store" tab. Read-only. */
export interface DsRackStoreSummary {
  store: string;
  rackCount: string;
  zones: string;
  capacity: number;
  occupied: number;
  available: number;
  status: Badge;
}

/** SKU-level stock row for the `store-inv` inventory layout — same shape family as
 * WhInventoryRow (warehouse) but scoped to a dark store, with a picked-today counter instead of
 * a warehouse location. Read-only. */
export interface DsInventoryRow {
  id: string;
  tab: string;
  sku: string;
  product: string;
  store: string;
  available: string;
  reserved: string;
  pickedToday: string;
  source: string;
  status: Badge;
}

/** A dark store comparison card — `stores` sites layout, "All stores" tab (columns: Store,
 * Manager, Hours, Capacity, Active orders, Pickers, Inventory, Status). Read-only. */
export interface DarkStoreCard {
  id: string; // derived short code, e.g. DS-01
  store: string;
  manager: string;
  hours: string;
  capacityPct: number;
  activeOrders: string;
  pickers: string;
  inventory: Badge;
  status: Badge;
}
