import type { Badge } from "@/types/common";

/**
 * A stuck-order / operational exception on the triage board (`exceptions`). Reshaped from
 * SYSTEM_CONFIGS.exceptions' "All open" + "Resolved" rows into one canonical, taggable list —
 * `category` drives which tab chip a case shows under (workspace/data/system.ts:6-50).
 */
export interface ExceptionCase {
  id: string;
  order: string;
  store: string;
  type: string;
  raisedAt: string;
  owner: string;
  age: string;
  status: Badge;
  category: "Order stuck" | "Payment" | "Picking / packing" | "Delivery" | "Resolved";
}

/** HSD Scanner device health row — `scanner` "Devices" tab. Read-only. */
export interface ScannerDevice {
  id: string;
  store: string;
  operator: string;
  lastActivity: string;
  network: string;
  lastSync: string;
  scansToday: string;
  status: Badge;
}

/** One scan-activity / exception / audit feed entry on the `scanner` stream tabs. Read-only. */
export interface ScannerFeedEvent {
  id: string;
  time: string;
  store: string;
  operator: string;
  action: string;
  reference: string;
  device: string;
  status: Badge;
  tab: "Scan activity" | "Exceptions" | "Audit";
}

/** One immutable barcode-scan event on the `scan-history` feed. Read-only. */
export interface ScanHistoryEvent {
  id: string;
  time: string;
  barcode: string;
  entity: "Product" | "Bag" | "Rack";
  reference: string;
  order: string;
  picker: string;
  device: string;
  status: Badge;
}

/**
 * One immutable audit-log entry (`audit`) — old/new value rendered as an inline diff. Read-only,
 * per the design's own hint: "Events are immutable — you can flag or export, not edit."
 */
export interface AuditEvent {
  id: string;
  event: string;
  user: string;
  module: string;
  record: string;
  oldValue: string;
  newValue: string;
  deviceIp: string;
  time: string;
  tab: "Inventory" | "Orders & refunds" | "Access" | "Config";
}
