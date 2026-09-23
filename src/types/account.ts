/**
 * Six named notification toggles on the Account Settings "Notifications" tab, transcribed
 * verbatim from the approved design (dc.html:6810-6821 `notifPrefs`) — a flat on/off list, not a
 * category × channel matrix.
 */
export const NOTIFICATION_PREF_ITEMS = [
  { key: "sla", label: "SLA breach alerts", sub: "Push + email the moment an order breaches" },
  { key: "transfer", label: "Transfer exceptions", sub: "Delays, discrepancies and short receipts" },
  { key: "stock", label: "Stockout digest", sub: "Hourly summary of out-of-stock SKUs" },
  { key: "refund", label: "Refund approvals", sub: "When a refund needs your sign-off" },
  { key: "sms", label: "SMS fallback", sub: "Send SMS if push is not delivered" },
  { key: "weekly", label: "Weekly performance report", sub: "Monday 08:00, all stores" },
] as const;

export type NotificationPrefKey = (typeof NOTIFICATION_PREF_ITEMS)[number]["key"];

export type NotificationPrefs = Record<NotificationPrefKey, boolean>;
