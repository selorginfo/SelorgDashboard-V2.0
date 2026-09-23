import type { SettingItem } from "@/types/system";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Transcribed from SYSTEM_CONFIGS.settings' 5 tabs (workspace/data/system.ts:201-231) — every
 * row is a distinct real setting, so this is a straight reshape (id slugged from name + scope,
 * tab kept as the group each setting is shown under). */
export const SEED_SETTINGS: SettingItem[] = [
  { id: "set-company-global", name: "Company", scope: "Global", value: "Selorg Quick Commerce Pvt Ltd", appliesTo: "All", owner: "Admin", lastChanged: "12 Aug", changedBy: "Arun K.", status: s("Published", "green"), tab: "Business" },
  { id: "set-currency-global", name: "Currency", scope: "Global", value: "INR (₹)", appliesTo: "All", owner: "Finance", lastChanged: "12 Aug", changedBy: "Arun K.", status: s("Published", "green"), tab: "Business" },
  { id: "set-tax-global", name: "Tax", scope: "Global", value: "GST slab-based", appliesTo: "Catalog", owner: "Finance", lastChanged: "14 Aug", changedBy: "Latha S.", status: s("Published", "green"), tab: "Business" },
  { id: "set-hours-global", name: "Operating hours", scope: "Global", value: "07:00 – 23:00", appliesTo: "Stores", owner: "Ops", lastChanged: "20 Aug", changedBy: "Kiran D.", status: s("Published", "green"), tab: "Business" },

  { id: "set-locations-wh01", name: "Locations", scope: "WH-01", value: "Bommasandra, Bengaluru", appliesTo: "Receiving", owner: "Warehouse", lastChanged: "10 Aug", changedBy: "Mahesh B.", status: s("Published", "green"), tab: "Warehouse" },
  { id: "set-zone-rack-bin-wh01", name: "Zone / rack / bin", scope: "WH-01", value: "4 zones · 108 racks · 1,296 bins", appliesTo: "Putaway", owner: "Warehouse", lastChanged: "15 Aug", changedBy: "Mahesh B.", status: s("Published", "green"), tab: "Warehouse" },
  { id: "set-receiving-tolerance-wh01", name: "Receiving tolerance", scope: "WH-01", value: "1% quantity variance", appliesTo: "Receiving", owner: "Warehouse", lastChanged: "Today", changedBy: "Mahesh B.", status: s("Published", "green"), tab: "Warehouse" },
  { id: "set-capacity-wh01", name: "Capacity", scope: "WH-01", value: "180,000 units", appliesTo: "Inbound", owner: "Warehouse", lastChanged: "10 Aug", changedBy: "Mahesh B.", status: s("Published", "green"), tab: "Warehouse" },

  { id: "set-store-timings-all", name: "Store timings", scope: "All stores", value: "07:00 – 23:00", appliesTo: "Orders", owner: "Ops", lastChanged: "20 Aug", changedBy: "Kiran D.", status: s("Published", "green"), tab: "Dark store" },
  { id: "set-delivery-radius-per-store", name: "Delivery radius", scope: "Per store", value: "3.0 – 5.0 km", appliesTo: "Zones", owner: "Ops", lastChanged: "22 Aug", changedBy: "Kiran D.", status: s("Published", "green"), tab: "Dark store" },
  { id: "set-sla-target-ds02", name: "SLA target", scope: "DS-02", value: "11 min", appliesTo: "Orders", owner: "Ops", lastChanged: "Today", changedBy: "Arun K.", status: s("Published", "green"), tab: "Dark store" },
  { id: "set-replenishment-rule-all", name: "Replenishment rule", scope: "All stores", value: "Reorder at 30% cover", appliesTo: "Transfers", owner: "Warehouse", lastChanged: "18 Aug", changedBy: "Mahesh B.", status: s("Published", "green"), tab: "Dark store" },

  { id: "set-cancellation-window-global", name: "Cancellation window", scope: "Global", value: "Until picking starts", appliesTo: "Orders", owner: "Ops", lastChanged: "16 Aug", changedBy: "Kiran D.", status: s("Published", "green"), tab: "Order rules" },
  { id: "set-refund-rule-global", name: "Refund rule", scope: "Global", value: "Auto for missing items < ₹500", appliesTo: "Refunds", owner: "Finance", lastChanged: "16 Aug", changedBy: "Latha S.", status: s("Published", "green"), tab: "Order rules" },
  { id: "set-delivery-fee-global", name: "Delivery fee", scope: "Global", value: "₹29 below ₹299", appliesTo: "Orders", owner: "Finance", lastChanged: "16 Aug", changedBy: "Latha S.", status: s("Published", "green"), tab: "Order rules" },
  { id: "set-cod-rule-global", name: "COD rule", scope: "Global", value: "Max ₹5,000 per order", appliesTo: "Payments", owner: "Finance", lastChanged: "16 Aug", changedBy: "Latha S.", status: s("Published", "green"), tab: "Order rules" },

  { id: "set-cities-global", name: "Cities", scope: "Global", value: "12 cities", appliesTo: "All", owner: "Admin", lastChanged: "01 Aug", changedBy: "Arun K.", status: s("Published", "green"), tab: "Master data" },
  { id: "set-order-statuses-global", name: "Order statuses", scope: "Global", value: "7 statuses", appliesTo: "Orders", owner: "Ops", lastChanged: "01 Aug", changedBy: "Kiran D.", status: s("Published", "green"), tab: "Master data" },
  { id: "set-transfer-statuses-global", name: "Transfer statuses", scope: "Global", value: "11 statuses", appliesTo: "Transfers", owner: "Warehouse", lastChanged: "01 Aug", changedBy: "Mahesh B.", status: s("Published", "green"), tab: "Master data" },
  { id: "set-payment-methods-global", name: "Payment methods", scope: "Global", value: "UPI, Card, Wallet, COD, Netbanking, EMI", appliesTo: "Payments", owner: "Finance", lastChanged: "01 Aug", changedBy: "Latha S.", status: s("Published", "green"), tab: "Master data" },
];
