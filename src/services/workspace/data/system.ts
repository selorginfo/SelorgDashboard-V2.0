import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { b, kpis, type Row } from "./helpers";

export const SYSTEM_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  exceptions: {
    hint: "Every stuck order grouped by the action it needs — stuck, missing item, payment, picking, packing, rider, delivery",
    flow: ["Detected", "Triaged", "Owner assigned", "Action taken", "Customer informed", "Resolved", "Audited"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["7", "Open exceptions"],
      ["2", "SLA breached", "var(--red-tx)"],
      ["3", "Payment failures", "var(--red-tx)"],
      ["1", "Rider unavailable", "var(--amber-tx)"],
      ["1", "Delivery failed", "var(--amber-tx)"],
      ["18 min", "Avg resolution"],
    ]),
    tabs: ["All open", "Order stuck", "Payment", "Picking / packing", "Delivery", "Resolved"],
    columns: ["Exception", "Order", "Store", "Type", "Raised", "Owner", "Age", "Status"],
    rows: {
      "All open": [
        ["EXC-3312", "SEL-104821", "DS-02 Koramangala", "Payment failure", "18:59", "Finance · Latha", "41 min", b("SLA breached", "red")],
        ["EXC-3311", "SEL-104799", "DS-03 HSR Layout", "Delivery failed", "18:20", "Delivery · Arjun", "1 h 20 m", b("SLA breached", "red")],
        ["EXC-3310", "SEL-104815", "DS-04 Whitefield", "Missing item", "18:47", "Store · Sanjay", "38 min", b("In progress", "amber")],
        ["EXC-3309", "SEL-104824", "DS-02 Koramangala", "Order stuck", "18:52", "Ops · Nisha", "33 min", b("In progress", "amber")],
        ["EXC-3308", "SEL-104808", "DS-01 Indiranagar", "Rider unavailable", "18:34", "Delivery · Arjun", "51 min", b("Waiting", "blue")],
        ["EXC-3307", "SEL-104805", "DS-03 HSR Layout", "Picking failure", "18:12", "Store · Divya", "1 h 13 m", b("Waiting", "blue")],
        ["EXC-3306", "SEL-104802", "DS-05 Jayanagar", "Payment failure", "17:58", "Finance · Latha", "1 h 27 m", b("In progress", "amber")],
      ] as Row[],
      "Order stuck": [["EXC-3309", "SEL-104824", "DS-02 Koramangala", "No picker for 12 min", "18:52", "Ops · Nisha", "33 min", b("In progress", "amber")]] as Row[],
      Payment: [
        ["EXC-3312", "SEL-104821", "DS-02 Koramangala", "Card declined", "18:59", "Finance · Latha", "41 min", b("SLA breached", "red")],
        ["EXC-3306", "SEL-104802", "DS-05 Jayanagar", "UPI timeout", "17:58", "Finance · Latha", "1 h 27 m", b("In progress", "amber")],
      ] as Row[],
      "Picking / packing": [
        ["EXC-3310", "SEL-104815", "DS-04 Whitefield", "Ghee 500ml not found", "18:47", "Store · Sanjay", "38 min", b("Substitute offered", "amber")],
        ["EXC-3307", "SEL-104805", "DS-03 HSR Layout", "Scan mismatch on pack", "18:12", "Store · Divya", "1 h 13 m", b("Waiting", "blue")],
      ] as Row[],
      Delivery: [
        ["EXC-3311", "SEL-104799", "DS-03 HSR Layout", "Customer unavailable", "18:20", "Delivery · Arjun", "1 h 20 m", b("Reattempt", "red")],
        ["EXC-3308", "SEL-104808", "DS-01 Indiranagar", "No rider in zone", "18:34", "Delivery · Arjun", "51 min", b("Waiting", "blue")],
      ] as Row[],
      Resolved: [
        ["EXC-3305", "SEL-104790", "DS-01 Indiranagar", "Missing item", "17:22", "Store · Nisha", "14 min", b("Refunded", "green")],
        ["EXC-3304", "SEL-104781", "DS-02 Koramangala", "Payment failure", "16:58", "Finance · Latha", "9 min", b("Retried", "green")],
      ] as Row[],
    },
  },

  notifications: {
    hint: "Trigger → audience → channel → send → delivery → escalation",
    flow: ["Event", "Rule matched", "Template rendered", "Queued", "Sent", "Delivered", "Escalated"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["32", "Templates"],
      ["18", "Active rules"],
      ["1.2M", "Sent this month"],
      ["98.4%", "Delivery rate"],
      ["4", "Failing rules", "var(--red-tx)"],
      ["3", "Escalation rules"],
    ]),
    tabs: ["Templates", "Rules", "Channels", "Delivery log"],
    columns: ["Name", "Trigger", "Audience", "Channel", "Timing", "Sent 24h", "Delivery", "Status"],
    rows: {
      Templates: [
        ["Order confirmed", "Order placed", "Customer", "Push + SMS", "Immediate", "1,482", "99.1%", b("Active", "green")],
        ["Order packed", "Packing complete", "Customer", "Push", "Immediate", "1,204", "98.8%", b("Active", "green")],
        ["Rider assigned", "Rider assigned", "Customer", "Push", "Immediate", "1,180", "98.4%", b("Active", "green")],
        ["Out for delivery", "Dispatch", "Customer", "Push + SMS", "Immediate", "1,166", "98.2%", b("Active", "green")],
        ["Payment failed", "Payment failure", "Customer", "SMS + Email", "Immediate", "18", "94.4%", b("Review", "amber")],
        ["Transfer dispatched", "Transfer dispatch", "Store manager", "Push", "Immediate", "9", "100%", b("Active", "green")],
        ["Transfer delayed", "ETA missed", "Ops + store", "Push + Email", "+15 min", "2", "100%", b("Active", "green")],
      ] as Row[],
      Rules: [
        ["SLA breach alert", "SLA > target", "Ops admin", "Push + Email", "On breach", "7", "100%", b("Active", "green")],
        ["Stockout alert", "Available = 0", "Warehouse + store", "Email", "Hourly digest", "9", "100%", b("Active", "green")],
        ["Scanner offline", "No heartbeat 15 min", "Store manager", "Push", "Immediate", "1", "100%", b("Active", "green")],
        ["COD short", "Deposit mismatch", "Finance", "Email", "End of shift", "1", "100%", b("Active", "green")],
      ] as Row[],
      Channels: [
        ["Push", "FCM", "All apps", "Push", "—", "4,210", "98.9%", b("Connected", "green")],
        ["SMS", "Gupshup", "Customer + rider", "SMS", "—", "1,860", "97.2%", b("Connected", "green")],
        ["Email", "SES", "Admin + finance", "Email", "—", "412", "99.6%", b("Connected", "green")],
      ] as Row[],
      "Delivery log": [
        ["Order confirmed", "SEL-104822", "Priya Nair", "Push", "19:02", "1", "Delivered", b("Success", "green")],
        ["Payment failed", "SEL-104821", "Rahul Desai", "SMS", "18:59", "2", "Delivered", b("Success", "green")],
        ["Transfer delayed", "TR-2291", "Sanjay L.", "Push", "19:14", "1", "Delivered", b("Success", "green")],
        ["Order packed", "SEL-104818", "Anjali Rao", "Push", "19:12", "1", "Failed", b("Retrying", "amber")],
      ] as Row[],
    },
  },

  users: {
    hint: "Admin users, their role, scope, sensitive rights and access state",
    flow: ["Invited", "Accepted", "Role assigned", "Scope set", "Active", "Reviewed", "Deactivated"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["41", "Admin users"],
      ["38", "Active"],
      ["3", "Pending invites", "var(--amber-tx)"],
      ["2", "Deactivated"],
      ["1", "2FA off", "var(--red-tx)"],
      ["8", "Roles in use"],
    ]),
    tabs: ["Admin users", "Invites", "Access review", "Deactivated"],
    columns: ["User / role", "Scope", "Email", "Modules", "Sensitive rights", "Last login", "2FA", "Status"],
    rows: {
      "Admin users": [
        ["Arun K. · Super Admin", "All", "arun@selorg.in", "26", "Approve, Refund, Export", "Today 18:40", "On", b("Active", "green")],
        ["Nisha R. · Dark Store Manager", "DS-01", "nisha@selorg.in", "9", "Assign", "Today 18:12", "On", b("Active", "green")],
        ["Mahesh B. · Warehouse Manager", "WH-01", "mahesh@selorg.in", "8", "Approve", "Today 17:55", "On", b("Active", "green")],
        ["Latha S. · Finance Admin", "All", "latha@selorg.in", "6", "Refund, Export", "Today 18:31", "On", b("Active", "green")],
        ["Arjun P. · Rider Manager", "All hubs", "arjun@selorg.in", "5", "Assign", "Today 19:01", "Off", b("Review 2FA", "amber")],
        ["Kiran D. · Ops Admin", "All", "kiran@selorg.in", "14", "Approve, Assign", "Yesterday", "On", b("Active", "green")],
      ] as Row[],
      Invites: [
        ["Pooja V. · Customer Support", "Global", "pooja@selorg.in", "6", "Refund (≤ ₹500)", "—", "Pending", b("Invited", "amber")],
        ["Ravi T. · Dark Store Manager", "DS-06", "ravi@selorg.in", "9", "Assign", "—", "Pending", b("Invited", "amber")],
        ["Sunil M. · Warehouse Manager", "WH-02", "sunil@selorg.in", "8", "Approve", "—", "Pending", b("Expiring", "red")],
      ] as Row[],
      "Access review": [
        ["Arjun P. · Rider Manager", "All hubs", "arjun@selorg.in", "5", "Assign", "Today 19:01", "Off", b("2FA missing", "red")],
        ["Kiran D. · Operations Admin", "All", "kiran@selorg.in", "14", "Approve, Assign", "Yesterday", "On", b("Due review", "amber")],
        ["Latha S. · Finance Admin", "All", "latha@selorg.in", "6", "Refund, Export", "Today 18:31", "On", b("Due review", "amber")],
      ] as Row[],
      Deactivated: [
        ["Vinay S. · Dark Store Manager", "DS-02", "vinay@selorg.in", "0", "—", "14 Aug", "—", b("Deactivated", "grey")],
        ["Neha B. · Customer Support", "Global", "neha@selorg.in", "0", "—", "02 Aug", "—", b("Deactivated", "grey")],
      ] as Row[],
    },
  },

  audit: {
    hint: "User, action, module, record, old value, new value, timestamp, device",
    flow: ["Action attempted", "Permission checked", "Applied", "Logged", "Reviewed", "Retained"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["12,884", "Events (30d)"],
      ["214", "Inventory adjustments"],
      ["58", "Refunds"],
      ["17", "Permission changes", "var(--amber-tx)"],
      ["9", "Transfer approvals"],
      ["0", "Tamper alerts"],
    ]),
    tabs: ["All events", "Inventory", "Orders & refunds", "Access", "Config"],
    columns: ["Event", "User", "Module", "Record", "Old value", "New value", "Device / IP", "Time"],
    rows: {
      "All events": [
        ["Refund initiated", "Latha S.", "Payments", "RFD-5510", "—", "₹980", "10.2.4.18", "19:12"],
        ["Rider reassigned", "Arjun P.", "Delivery", "SEL-104799", "Imran A.", "Naveen R.", "10.2.4.31", "19:06"],
        ["Stock adjusted", "Mahesh B.", "Warehouse", "SEL-2214", "240", "228", "10.2.1.09", "18:52"],
        ["Transfer approved", "Kiran D.", "Warehouse", "TR-2293", "Pending", "Approved", "10.2.1.14", "18:40"],
        ["Price changed", "Priyanka J.", "Catalog", "SEL-1102", "₹45", "₹39", "10.2.6.22", "18:22"],
        ["Permission changed", "Arun K.", "Admin", "Role: Support", "Refund ₹500", "Refund ₹1,000", "10.2.0.02", "17:58"],
      ] as Row[],
      Inventory: [
        ["Stock adjusted", "Mahesh B.", "Warehouse", "SEL-2214", "240", "228", "10.2.1.09", "18:52"],
        ["Marked damaged", "Mahesh B.", "Warehouse", "SEL-1010", "120", "96", "10.2.1.09", "18:10"],
        ["Stock received", "Sanjay L.", "Dark store", "TR-2289", "180", "168", "10.2.5.11", "17:44"],
      ] as Row[],
      "Orders & refunds": [
        ["Refund initiated", "Latha S.", "Payments", "RFD-5510", "—", "₹980", "10.2.4.18", "19:12"],
        ["Order cancelled", "Nisha R.", "Orders", "SEL-104806", "Picking", "Cancelled", "10.2.2.04", "18:34"],
        ["Picker reassigned", "Nisha R.", "Orders", "SEL-104824", "—", "Ravi M.", "10.2.2.04", "18:55"],
      ] as Row[],
      Access: [
        ["Permission changed", "Arun K.", "Admin", "Role: Support", "Refund ₹500", "Refund ₹1,000", "10.2.0.02", "17:58"],
        ["Login", "Arjun P.", "Admin", "Session", "—", "Success", "10.2.4.31", "17:02"],
        ["User invited", "Arun K.", "Admin", "pooja@selorg.in", "—", "Support role", "10.2.0.02", "16:40"],
      ] as Row[],
      Config: [
        ["SLA target changed", "Arun K.", "Settings", "DS-02", "12 min", "11 min", "10.2.0.02", "16:12"],
        ["Receiving rule changed", "Mahesh B.", "Settings", "WH-01", "Tolerance 2%", "Tolerance 1%", "10.2.1.09", "15:48"],
      ] as Row[],
    },
  },

  settings: {
    hint: "Business, warehouse, dark store and order rules plus the master data everything reads from",
    flow: ["Draft", "Reviewed", "Approved", "Published", "Audited"].map((label) => ({ label, actor: "" })),
    kpis: kpis([
      ["4", "Warehouses"],
      ["18", "Dark stores"],
      ["7", "Order statuses"],
      ["11", "Transfer statuses"],
      ["6", "Payment methods"],
      ["12", "Cities"],
    ]),
    tabs: ["Business", "Warehouse", "Dark store", "Order rules", "Master data"],
    columns: ["Setting", "Scope", "Current value", "Applies to", "Owner", "Last changed", "By", "Status"],
    rows: {
      Business: [
        ["Company", "Global", "Selorg Quick Commerce Pvt Ltd", "All", "Admin", "12 Aug", "Arun K.", b("Published", "green")],
        ["Currency", "Global", "INR (₹)", "All", "Finance", "12 Aug", "Arun K.", b("Published", "green")],
        ["Tax", "Global", "GST slab-based", "Catalog", "Finance", "14 Aug", "Latha S.", b("Published", "green")],
        ["Operating hours", "Global", "07:00 – 23:00", "Stores", "Ops", "20 Aug", "Kiran D.", b("Published", "green")],
      ] as Row[],
      Warehouse: [
        ["Locations", "WH-01", "Bommasandra, Bengaluru", "Receiving", "Warehouse", "10 Aug", "Mahesh B.", b("Published", "green")],
        ["Zone / rack / bin", "WH-01", "4 zones · 108 racks · 1,296 bins", "Putaway", "Warehouse", "15 Aug", "Mahesh B.", b("Published", "green")],
        ["Receiving tolerance", "WH-01", "1% quantity variance", "Receiving", "Warehouse", "Today", "Mahesh B.", b("Published", "green")],
        ["Capacity", "WH-01", "180,000 units", "Inbound", "Warehouse", "10 Aug", "Mahesh B.", b("Published", "green")],
      ] as Row[],
      "Dark store": [
        ["Store timings", "All stores", "07:00 – 23:00", "Orders", "Ops", "20 Aug", "Kiran D.", b("Published", "green")],
        ["Delivery radius", "Per store", "3.0 – 5.0 km", "Zones", "Ops", "22 Aug", "Kiran D.", b("Published", "green")],
        ["SLA target", "DS-02", "11 min", "Orders", "Ops", "Today", "Arun K.", b("Published", "green")],
        ["Replenishment rule", "All stores", "Reorder at 30% cover", "Transfers", "Warehouse", "18 Aug", "Mahesh B.", b("Published", "green")],
      ] as Row[],
      "Order rules": [
        ["Cancellation window", "Global", "Until picking starts", "Orders", "Ops", "16 Aug", "Kiran D.", b("Published", "green")],
        ["Refund rule", "Global", "Auto for missing items < ₹500", "Refunds", "Finance", "16 Aug", "Latha S.", b("Published", "green")],
        ["Delivery fee", "Global", "₹29 below ₹299", "Orders", "Finance", "16 Aug", "Latha S.", b("Published", "green")],
        ["COD rule", "Global", "Max ₹5,000 per order", "Payments", "Finance", "16 Aug", "Latha S.", b("Published", "green")],
      ] as Row[],
      "Master data": [
        ["Cities", "Global", "12 cities", "All", "Admin", "01 Aug", "Arun K.", b("Published", "green")],
        ["Order statuses", "Global", "7 statuses", "Orders", "Ops", "01 Aug", "Kiran D.", b("Published", "green")],
        ["Transfer statuses", "Global", "11 statuses", "Transfers", "Warehouse", "01 Aug", "Mahesh B.", b("Published", "green")],
        ["Payment methods", "Global", "UPI, Card, Wallet, COD, Netbanking, EMI", "Payments", "Finance", "01 Aug", "Latha S.", b("Published", "green")],
      ] as Row[],
    },
  },

  integrations: {
    hint: "Connection state, last sync and retry queues across the platform and the four apps",
    flow: ["Configured", "Connected", "Syncing", "Healthy", "Degraded", "Retrying"].map((label) => ({ label, actor: "" })),
    kpis: kpis([
      ["9", "Integrations"],
      ["8", "Connected"],
      ["1", "Degraded", "var(--amber-tx)"],
      ["24", "Retries queued", "var(--amber-tx)"],
      ["99.94%", "Uptime 30d"],
      ["1.2 s", "Avg sync"],
    ]),
    tabs: ["Integrations", "Health", "Error log", "Retry queue"],
    columns: ["System", "Type", "Environment", "Last sync", "Latency", "Errors 24h", "Retries", "Status"],
    rows: {
      Integrations: [
        ["Razorpay", "Payment gateway", "Production", "19:12", "320 ms", "18", "0", b("Connected", "green")],
        ["Google Maps", "Maps & routing", "Production", "19:14", "180 ms", "0", "0", b("Connected", "green")],
        ["FCM + Gupshup", "Notifications", "Production", "19:14", "240 ms", "4", "2", b("Connected", "green")],
        ["Selorg OMS", "Backend / OMS", "Production", "19:14", "90 ms", "0", "0", b("Connected", "green")],
        ["Warehouse WMS", "Warehouse system", "Production", "19:10", "410 ms", "6", "22", b("Degraded", "amber")],
        ["Picker App API", "Picker system", "Production", "19:14", "110 ms", "0", "0", b("Connected", "green")],
        ["HSD Scanner sync", "Scanner system", "Production", "19:10", "260 ms", "3", "0", b("Connected", "green")],
        ["Rider App API", "Rider system", "Production", "19:14", "130 ms", "1", "0", b("Connected", "green")],
        ["Customer App API", "Customer system", "Production", "19:14", "100 ms", "0", "0", b("Connected", "green")],
      ] as Row[],
      Health: [
        ["Warehouse WMS", "Warehouse system", "Production", "19:10", "410 ms", "6", "22", b("Investigating", "amber")],
        ["Razorpay", "Payment gateway", "Production", "19:12", "320 ms", "18", "0", b("Elevated errors", "amber")],
        ["Selorg OMS", "Backend / OMS", "Production", "19:14", "90 ms", "0", "0", b("Healthy", "green")],
      ] as Row[],
      "Error log": [
        ["Warehouse WMS", "Putaway sync", "Production", "19:08", "timeout", "6", "22", b("Open", "red")],
        ["Razorpay", "Card capture", "Production", "18:59", "gateway declined", "18", "0", b("Expected", "amber")],
        ["HSD Scanner sync", "Heartbeat HSD-07", "Production", "08:12", "device offline", "3", "0", b("Open", "red")],
      ] as Row[],
      "Retry queue": [
        ["Warehouse WMS", "Putaway confirm", "Production", "19:10", "—", "—", "22", b("Queued", "amber")],
        ["FCM", "Order packed push", "Production", "19:12", "—", "—", "2", b("Queued", "amber")],
      ] as Row[],
    },
  },
};
