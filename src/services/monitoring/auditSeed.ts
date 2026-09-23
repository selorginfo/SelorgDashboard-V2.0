import type { AuditEvent } from "@/types/monitoring";

/** Reshaped from SYSTEM_CONFIGS.audit's "All events" tab plus the unique rows only surfaced
 * under its category tabs (workspace/data/system.ts:157-184) into one canonical, immutable
 * timeline — `tab` keeps each event's category so the tab chips filter this single list instead
 * of re-fetching per-tab rows. Read-only, per the design's own hint. */
export const SEED_AUDIT_EVENTS: AuditEvent[] = [
  { id: "aud-1", event: "Refund initiated", user: "Latha S.", module: "Payments", record: "RFD-5510", oldValue: "—", newValue: "₹980", deviceIp: "10.2.4.18", time: "19:12", tab: "Orders & refunds" },
  { id: "aud-2", event: "Rider reassigned", user: "Arjun P.", module: "Delivery", record: "SEL-104799", oldValue: "Imran A.", newValue: "Naveen R.", deviceIp: "10.2.4.31", time: "19:06", tab: "Orders & refunds" },
  { id: "aud-3", event: "Picker reassigned", user: "Nisha R.", module: "Orders", record: "SEL-104824", oldValue: "—", newValue: "Ravi M.", deviceIp: "10.2.2.04", time: "18:55", tab: "Orders & refunds" },
  { id: "aud-4", event: "Stock adjusted", user: "Mahesh B.", module: "Warehouse", record: "SEL-2214", oldValue: "240", newValue: "228", deviceIp: "10.2.1.09", time: "18:52", tab: "Inventory" },
  { id: "aud-5", event: "Order cancelled", user: "Nisha R.", module: "Orders", record: "SEL-104806", oldValue: "Picking", newValue: "Cancelled", deviceIp: "10.2.2.04", time: "18:34", tab: "Orders & refunds" },
  { id: "aud-6", event: "Transfer approved", user: "Kiran D.", module: "Warehouse", record: "TR-2293", oldValue: "Pending", newValue: "Approved", deviceIp: "10.2.1.14", time: "18:40", tab: "Inventory" },
  { id: "aud-7", event: "Price changed", user: "Priyanka J.", module: "Catalog", record: "SEL-1102", oldValue: "₹45", newValue: "₹39", deviceIp: "10.2.6.22", time: "18:22", tab: "Config" },
  { id: "aud-8", event: "Marked damaged", user: "Mahesh B.", module: "Warehouse", record: "SEL-1010", oldValue: "120", newValue: "96", deviceIp: "10.2.1.09", time: "18:10", tab: "Inventory" },
  { id: "aud-9", event: "Stock received", user: "Sanjay L.", module: "Dark store", record: "TR-2289", oldValue: "180", newValue: "168", deviceIp: "10.2.5.11", time: "17:44", tab: "Inventory" },
  { id: "aud-10", event: "Permission changed", user: "Arun K.", module: "Admin", record: "Role: Support", oldValue: "Refund ₹500", newValue: "Refund ₹1,000", deviceIp: "10.2.0.02", time: "17:58", tab: "Access" },
  { id: "aud-11", event: "Login", user: "Arjun P.", module: "Admin", record: "Session", oldValue: "—", newValue: "Success", deviceIp: "10.2.4.31", time: "17:02", tab: "Access" },
  { id: "aud-12", event: "User invited", user: "Arun K.", module: "Admin", record: "pooja@selorg.in", oldValue: "—", newValue: "Support role", deviceIp: "10.2.0.02", time: "16:40", tab: "Access" },
  { id: "aud-13", event: "SLA target changed", user: "Arun K.", module: "Settings", record: "DS-02", oldValue: "12 min", newValue: "11 min", deviceIp: "10.2.0.02", time: "16:12", tab: "Config" },
  { id: "aud-14", event: "Receiving rule changed", user: "Mahesh B.", module: "Settings", record: "WH-01", oldValue: "Tolerance 2%", newValue: "Tolerance 1%", deviceIp: "10.2.1.09", time: "15:48", tab: "Config" },
];
