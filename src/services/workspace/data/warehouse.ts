import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { b, kpis, type Row } from "./helpers";

export const WAREHOUSE_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  wh: {
    hint: "WH-01 Bommasandra · central warehouse supplying 5 dark stores",
    flow: [],
    kpis: kpis([
      ["128,410", "Total stock (units)"],
      ["3,284", "Total SKUs"],
      ["11,240", "Reserved"],
      ["612", "Damaged", "var(--red-tx)"],
      ["42", "Low stock", "var(--amber-tx)"],
      ["9", "Out of stock", "var(--red-tx)"],
    ]),
    tabs: ["Activity", "Inbound", "Transfers out", "Alerts"],
    columns: ["Reference", "Type", "Counterparty", "Items", "Operator", "Status", "Updated"],
    rows: {
      Activity: [
        ["GRN-8841", "Receiving", "Freshfarm Agro Pvt Ltd", "214 units", "Mahesh B.", b("Discrepancy", "red"), "12 min ago"],
        ["TR-2291", "Transfer out", "DS-04 Whitefield", "480 units", "Kiran D.", b("In transit", "blue"), "18 min ago"],
        ["PUT-5510", "Putaway", "Zone A · Rack 12", "96 units", "Ganesh R.", b("Completed", "green"), "31 min ago"],
        ["TR-2290", "Transfer out", "DS-01 Indiranagar", "512 units", "Kiran D.", b("Received", "green"), "1 h ago"],
        ["ADJ-1188", "Adjustment", "Damage write-off", "−24 units", "Mahesh B.", b("Approved", "green"), "2 h ago"],
        ["GRN-8840", "Receiving", "Nandini Dairy", "640 units", "Latha S.", b("Completed", "green"), "3 h ago"],
      ] as Row[],
      Inbound: [
        ["PO-4410", "Purchase order", "Freshfarm Agro", "2,400 units", "Procurement", b("Receiving", "amber"), "Today 08:20"],
        ["PO-4409", "Purchase order", "Nandini Dairy", "1,800 units", "Procurement", b("Completed", "green"), "Today 06:05"],
        ["PO-4408", "Purchase order", "Sunrise Oils", "900 units", "Procurement", b("QC pending", "amber"), "Yesterday"],
      ] as Row[],
      "Transfers out": [
        ["TR-2291", "Transfer", "DS-04 Whitefield", "480 units", "Kiran D.", b("Delayed", "red"), "18 min ago"],
        ["TR-2292", "Transfer", "DS-02 Koramangala", "360 units", "Kiran D.", b("Picking", "amber"), "25 min ago"],
        ["TR-2293", "Transfer", "DS-03 HSR Layout", "290 units", "Anil V.", b("Approved", "blue"), "40 min ago"],
      ] as Row[],
      Alerts: [
        ["ALT-771", "Low stock", "SEL-2214 Amul Gold 1L", "118 units", "System", b("Open", "amber"), "9 min ago"],
        ["ALT-770", "Expiry", "SEL-2288 Yoghurt · batch B-4412", "64 units", "System", b("Open", "red"), "1 h ago"],
        ["ALT-768", "Inventory mismatch", "Zone C · Rack 04", "−12 units", "System", b("Investigating", "amber"), "3 h ago"],
      ] as Row[],
    },
  },

  "wh-inv": {
    hint: "Stock held at the central warehouse, by location and batch",
    flow: [],
    kpis: kpis([
      ["3,284", "SKUs"],
      ["117,170", "Available"],
      ["11,240", "Reserved"],
      ["612", "Damaged", "var(--red-tx)"],
      ["86", "Expiring 30d", "var(--amber-tx)"],
      ["₹2.14 Cr", "Inventory value"],
    ]),
    tabs: ["All SKUs", "Low stock", "Expiring", "Damaged"],
    columns: ["SKU", "Product", "Batch", "Expiry", "Available", "Reserved", "Location", "Status"],
    rows: {
      "All SKUs": [
        ["SEL-1102", "Organic Tomato 500g", "B-5510", "12 Sep 26", "1,240", "180", "A · R04 · B12", b("Healthy", "green")],
        ["SEL-2214", "Amul Gold Milk 1L", "B-5488", "02 Sep 26", "118", "96", "C · R01 · B03", b("Low", "amber")],
        ["SEL-4410", "Basmati Rice 5kg", "B-5301", "14 Mar 27", "2,860", "410", "B · R09 · B22", b("Healthy", "green")],
        ["SEL-4415", "Ghee 500ml", "B-5340", "20 Jan 27", "0", "0", "B · R11 · B07", b("Out of stock", "red")],
        ["SEL-1187", "Farm Eggs 12pc", "B-5502", "04 Sep 26", "640", "120", "C · R02 · B08", b("Healthy", "green")],
        ["SEL-2288", "Yoghurt 200g", "B-4412", "30 Aug 26", "64", "12", "C · R01 · B09", b("Expiring", "amber")],
        ["SEL-5501", "Chicken Breast 500g", "B-5519", "29 Aug 26", "210", "40", "D · R01 · B01", b("Expiring", "amber")],
      ] as Row[],
      "Low stock": [
        ["SEL-2214", "Amul Gold Milk 1L", "B-5488", "02 Sep 26", "118", "96", "C · R01 · B03", b("Low", "amber")],
        ["SEL-4419", "Cold Pressed Oil 1L", "B-5288", "10 Dec 26", "88", "60", "B · R11 · B02", b("Low", "amber")],
      ] as Row[],
      Expiring: [
        ["SEL-2288", "Yoghurt 200g", "B-4412", "30 Aug 26", "64", "12", "C · R01 · B09", b("4 days", "red")],
        ["SEL-5501", "Chicken Breast 500g", "B-5519", "29 Aug 26", "210", "40", "D · R01 · B01", b("3 days", "red")],
      ] as Row[],
      Damaged: [
        ["SEL-1010", "Banana Robusta 1kg", "B-5490", "—", "—", "—", "Quarantine · Q1", b("Write-off", "red")],
        ["SEL-1220", "Apple Shimla 1kg", "B-5477", "—", "—", "—", "Quarantine · Q1", b("Pending QC", "amber")],
      ] as Row[],
    },
  },

  inbound: {
    hint: "Purchase order → receiving → quality check → GRN → putaway",
    flow: ["PO", "Expected", "Received", "Qty verified", "Quality check", "Accepted", "GRN", "Putaway"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["4", "Shipments today"],
      ["2", "In receiving"],
      ["1", "QC pending", "var(--amber-tx)"],
      ["1", "Discrepancy", "var(--red-tx)"],
      ["214", "Units short", "var(--red-tx)"],
      ["98.2%", "Fill rate"],
    ]),
    tabs: ["Receiving queue", "Quality check", "GRN", "Rejected"],
    columns: ["Reference", "Supplier", "SKU", "Expected", "Received", "Accepted", "Rejected", "Status"],
    rows: {
      "Receiving queue": [
        ["GRN-8841", "Freshfarm Agro", "SEL-2214", "240", "228", "228", "0", b("Discrepancy", "red")],
        ["GRN-8842", "Sunrise Oils", "SEL-4419", "300", "300", "288", "12", b("QC", "amber")],
        ["GRN-8843", "Nandini Dairy", "SEL-2280", "480", "480", "480", "0", b("Accepted", "green")],
        ["GRN-8844", "Green Valley", "SEL-1043", "180", "—", "—", "—", b("Expected", "grey")],
      ] as Row[],
      "Quality check": [
        ["QC-3310", "Sunrise Oils", "SEL-4419", "300", "300", "288", "12", b("In QC", "amber")],
        ["QC-3309", "Freshfarm Agro", "SEL-1102", "600", "600", "594", "6", b("Passed", "green")],
      ] as Row[],
      GRN: [
        ["GRN-8840", "Nandini Dairy", "SEL-2288", "640", "640", "640", "0", b("Closed", "green")],
        ["GRN-8839", "Green Valley", "SEL-1077", "220", "220", "214", "6", b("Closed", "green")],
      ] as Row[],
      Rejected: [
        ["REJ-1120", "Sunrise Oils", "SEL-4419", "300", "300", "288", "12", b("Debit note", "amber")],
        ["REJ-1119", "Freshfarm Agro", "SEL-1102", "600", "600", "594", "6", b("Returned", "grey")],
      ] as Row[],
    },
  },

  putaway: {
    hint: "Warehouse → Zone → Rack → Shelf / Bin → SKU / Batch",
    flow: ["GRN accepted", "Putaway queue", "Location suggested", "Location assigned", "Moved", "Confirmed", "Stock live"].map(
      (label) => ({ label, actor: "" })
    ),
    kpis: kpis([
      ["46", "In queue"],
      ["1,208", "Bins in use"],
      ["92%", "Location accuracy"],
      ["18", "Moves today"],
      ["3", "Audits due", "var(--amber-tx)"],
      ["6.2 min", "Avg putaway"],
    ]),
    tabs: ["Putaway queue", "Confirmed", "Stock moves", "Locations", "Audits"],
    columns: ["Task", "GRN", "SKU", "Quantity", "Batch", "Suggested", "Assigned", "Status"],
    rows: {
      "Putaway queue": [
        ["PUT-5514", "GRN-8843", "SEL-2280", "480", "B-5522", "C · R01 · B04", "C · R01 · B04", b("Ready", "blue")],
        ["PUT-5513", "GRN-8842", "SEL-4419", "288", "B-5520", "B · R11 · B02", "—", b("Awaiting operator", "amber")],
        ["PUT-5512", "GRN-8841", "SEL-2214", "228", "B-5519", "C · R01 · B03", "C · R01 · B03", b("In progress", "amber")],
      ] as Row[],
      Confirmed: [
        ["PUT-5511", "GRN-8840", "SEL-2288", "640", "B-5510", "C · R01 · B09", "C · R01 · B09", b("Confirmed", "green")],
        ["PUT-5510", "GRN-8839", "SEL-1077", "214", "B-5508", "A · R12 · B06", "A · R12 · B06", b("Confirmed", "green")],
      ] as Row[],
      "Stock moves": [
        ["MOV-990", "—", "SEL-4410", "400", "B-5301", "B · R09 · B22", "B · R09 · B18", b("Completed", "green")],
        ["MOV-989", "—", "SEL-1102", "120", "B-5510", "A · R04 · B12", "A · R04 · B10", b("Completed", "green")],
      ] as Row[],
      Locations: [
        ["Zone A", "—", "Fruits & vegetables", "412 SKUs", "—", "32 racks", "78% full", b("Healthy", "green")],
        ["Zone B", "—", "Staples", "508 SKUs", "—", "40 racks", "91% full", b("Near capacity", "amber")],
        ["Zone C", "—", "Dairy & chilled", "286 SKUs", "—", "24 racks", "66% full", b("Healthy", "green")],
        ["Zone D", "—", "Meat & frozen", "96 SKUs", "—", "12 racks", "48% full", b("Healthy", "green")],
      ] as Row[],
      Audits: [
        ["AUD-311", "—", "Zone C · R01", "—", "—", "Cycle count", "Ganesh R.", b("Due today", "amber")],
        ["AUD-310", "—", "Zone B · R09", "—", "—", "Cycle count", "Mahesh B.", b("Completed", "green")],
      ] as Row[],
    },
  },

  "inbound-asn": {
    hint: "Advance Shipment Notices — expected stock arrivals from suppliers with pre-declared contents",
    flow: [],
    kpis: kpis([
      ["6", "Expected today"],
      ["2", "Arriving now"],
      ["4", "Scheduled"],
      ["1,840", "Units expected"],
      ["3", "Suppliers"],
      ["96.4%", "Fill rate"],
    ]),
    tabs: ["Today", "This week", "Overdue"],
    columns: ["ASN", "Supplier", "PO", "SKUs", "Expected qty", "Expected date", "Carrier", "Status"],
    rows: {
      Today: [
        ["ASN-6610", "Freshfarm Agro Pvt Ltd", "PO-4412", "8", "480", "12 Sep 10:00", "Blue Dart", b("Arriving", "blue")],
        ["ASN-6611", "Nandini Dairy", "PO-4413", "4", "640", "12 Sep 11:30", "Own vehicle", b("On route", "blue")],
        ["ASN-6612", "Sunrise Oils", "PO-4414", "3", "300", "12 Sep 14:00", "DTDC", b("Scheduled", "grey")],
        ["ASN-6613", "Green Valley Farms", "PO-4415", "6", "420", "12 Sep 15:00", "Delhivery", b("Scheduled", "grey")],
      ] as Row[],
      "This week": [
        ["ASN-6614", "Freshfarm Agro Pvt Ltd", "PO-4416", "10", "600", "13 Sep", "Blue Dart", b("Confirmed", "green")],
        ["ASN-6615", "Nandini Dairy", "PO-4417", "5", "800", "14 Sep", "Own vehicle", b("Confirmed", "green")],
        ["ASN-6616", "MTR Foods Pvt Ltd", "PO-4418", "12", "480", "15 Sep", "DTDC", b("Pending ASN", "amber")],
      ] as Row[],
      Overdue: [
        ["ASN-6608", "Sunrise Oils", "PO-4410", "4", "300", "10 Sep", "Delhivery", b("Overdue 2 days", "red")],
        ["ASN-6609", "Green Valley Farms", "PO-4411", "6", "240", "11 Sep", "Blue Dart", b("Overdue 1 day", "amber")],
      ] as Row[],
    },
  },

  "wh-approvals": {
    hint: "Pending dark store replenishment requests awaiting warehouse manager approval",
    flow: [],
    kpis: kpis([
      ["7", "Pending approvals"],
      ["3", "Urgent", "var(--amber-tx)"],
      ["4", "Normal"],
      ["2", "Approved today"],
      ["1", "Rejected today"],
      ["₹3.6L", "Value"],
    ]),
    tabs: ["Pending", "Approved", "Rejected"],
    columns: ["Request", "Store", "SKU", "Qty", "Value", "Requested by", "Requested at", "Status"],
    rows: {
      Pending: [
        ["REQ-7710", "DS-02 Koramangala", "SEL-2214 Amul Gold Milk 1L", "480", "₹38,400", "Arjun P.", "12 Sep 08:10", b("Urgent", "red")],
        ["REQ-7711", "DS-04 Whitefield", "SEL-4415 Ghee 500ml", "240", "₹54,000", "Sanjay L.", "12 Sep 08:45", b("Urgent", "amber")],
        ["REQ-7712", "DS-01 Indiranagar", "SEL-1102 Organic Tomato 500g", "360", "₹21,600", "Nisha R.", "12 Sep 09:00", b("Normal", "grey")],
        ["REQ-7713", "DS-03 HSR Layout", "SEL-4410 Basmati Rice 5kg", "120", "₹42,000", "Divya M.", "12 Sep 09:20", b("Low", "grey")],
      ] as Row[],
      Approved: [
        ["REQ-7708", "DS-01 Indiranagar", "SEL-1187 Farm Eggs 12pc", "300", "₹15,000", "Nisha R.", "12 Sep 07:30", b("Approved", "green")],
        ["REQ-7709", "DS-05 Jayanagar", "SEL-2280 Curd 400g", "180", "₹7,200", "Rekha N.", "12 Sep 07:50", b("Approved", "green")],
      ] as Row[],
      Rejected: [
        ["REQ-7704", "DS-02 Koramangala", "SEL-4419 Cold Pressed Oil 1L", "200", "₹38,000", "Arjun P.", "11 Sep 16:30", b("Insufficient stock", "red")],
      ] as Row[],
    },
  },

  "wh-transfer": {
    hint: "Internal warehouse transfers between zones and rack locations",
    flow: [],
    kpis: kpis([
      ["4", "Active transfers"],
      ["2", "In progress"],
      ["1", "Completed today"],
      ["1", "Delayed", "var(--red-tx)"],
      ["840", "Units moved"],
      ["99.1%", "Accuracy"],
    ]),
    tabs: ["Active", "Completed", "Discrepancy"],
    columns: ["Transfer", "From zone", "To zone", "SKU", "Qty", "Operator", "Started", "Status"],
    rows: {
      Active: [
        ["WTR-4410", "Zone B · R09", "Zone A · R04", "SEL-4410 Basmati Rice 5kg", "240", "Kiran D.", "09:10", b("In progress", "amber")],
        ["WTR-4411", "Zone C · R01", "Zone C · R03", "SEL-2214 Amul Gold Milk 1L", "120", "Ganesh R.", "09:40", b("In progress", "amber")],
        ["WTR-4412", "Zone A · R12", "Zone D · R01", "SEL-5501 Chicken Breast 500g", "80", "Mahesh B.", "10:00", b("Delayed", "red")],
        ["WTR-4413", "Zone B · R11", "Zone B · R07", "SEL-4415 Ghee 500ml", "160", "Anil V.", "10:20", b("Assigned", "blue")],
      ] as Row[],
      Completed: [
        ["WTR-4408", "Zone C · R02", "Zone C · R04", "SEL-1187 Farm Eggs 12pc", "180", "Ganesh R.", "08:00", b("Completed", "green")],
        ["WTR-4409", "Zone A · R04", "Zone A · R06", "SEL-1102 Organic Tomato 500g", "220", "Kiran D.", "08:30", b("Completed", "green")],
      ] as Row[],
      Discrepancy: [
        ["WTR-4407", "Zone B · R09", "Zone B · R11", "SEL-4410 Basmati Rice 5kg", "200", "Mahesh B.", "07:00", b("8 units short", "red")],
      ] as Row[],
    },
  },

  "wh-transfer-approve": {
    hint: "Approval queue for inter-zone warehouse transfer requests before operations team executes",
    flow: [],
    kpis: kpis([
      ["3", "Pending"],
      ["1", "Urgent", "var(--amber-tx)"],
      ["2", "Normal"],
      ["4", "Approved today"],
      ["0", "Rejected"],
      ["₹1.8L", "Value"],
    ]),
    tabs: ["Pending", "Approved", "Rejected"],
    columns: ["Transfer", "From zone", "To zone", "SKUs", "Qty", "Value", "Requested by", "Status"],
    rows: {
      Pending: [
        ["WTR-4414", "Zone C · R01", "Zone C · R05", "SEL-2214", "360", "₹28,800", "Latha S.", b("Urgent", "amber")],
        ["WTR-4415", "Zone B · R09", "Zone B · R12", "SEL-4410", "200", "₹70,000", "Kiran D.", b("Pending", "grey")],
        ["WTR-4416", "Zone A · R04", "Zone A · R08", "SEL-1102", "140", "₹8,400", "Anil V.", b("Pending", "grey")],
      ] as Row[],
      Approved: [
        ["WTR-4410", "Zone B · R09", "Zone A · R04", "SEL-4410", "240", "₹84,000", "Kiran D.", b("Approved", "green")],
        ["WTR-4411", "Zone C · R01", "Zone C · R03", "SEL-2214", "120", "₹9,600", "Ganesh R.", b("Approved", "green")],
        ["WTR-4412", "Zone A · R12", "Zone D · R01", "SEL-5501", "80", "₹12,000", "Mahesh B.", b("Approved", "green")],
        ["WTR-4413", "Zone B · R11", "Zone B · R07", "SEL-4415", "160", "₹36,000", "Anil V.", b("Approved", "green")],
      ] as Row[],
      Rejected: [] as Row[],
    },
  },

  "wh-audit": {
    hint: "Warehouse stock audits — zone cycle counts, rack-level variance investigation and compliance",
    flow: [],
    kpis: kpis([
      ["2", "Audits due"],
      ["1", "In progress"],
      ["12", "Completed this month"],
      ["3,284", "SKUs audited"],
      ["8", "Discrepancies", "var(--amber-tx)"],
      ["99.8%", "Accuracy"],
    ]),
    tabs: ["Due", "In progress", "Completed"],
    columns: ["Audit", "Zone", "Rack", "SKUs", "Scanned", "Variance", "Auditor", "Status"],
    rows: {
      Due: [
        ["AUD-311", "Zone C", "R01", "42", "—", "—", "Ganesh R.", b("Due today", "amber")],
        ["AUD-312", "Zone B", "R09", "64", "—", "—", "Mahesh B.", b("Due today", "grey")],
      ] as Row[],
      "In progress": [
        ["AUD-310", "Zone A", "R04 – R06", "128", "96", "+2 / −1", "Kiran D.", b("In progress", "amber")],
      ] as Row[],
      Completed: [
        ["AUD-309", "Zone D", "R01 – R02", "48", "48", "0", "Latha S.", b("Clean", "green")],
        ["AUD-308", "Zone C", "R02 – R03", "86", "86", "+1", "Ganesh R.", b("Minor variance", "amber")],
        ["AUD-307", "Zone B", "R07 – R08", "110", "110", "0", "Mahesh B.", b("Clean", "green")],
      ] as Row[],
    },
  },

  transfers: {
    hint: "Replenishment from WH-01 Bommasandra to the dark stores",
    flow: [
      "Requested",
      "Pending approval",
      "Approved",
      "Transfer picking",
      "Ready",
      "Dispatched",
      "In transit",
      "Received",
      "Completed",
    ].map((label) => ({ label, actor: "" })),
    kpis: kpis([
      ["9", "Open transfers"],
      ["3", "Pending approval", "var(--amber-tx)"],
      ["2", "Picking"],
      ["5", "In transit"],
      ["3", "Awaiting receipt"],
      ["1", "Discrepancy", "var(--red-tx)"],
    ]),
    tabs: ["All", "Pending approval", "In transit", "Receiving", "Discrepancy"],
    columns: ["Transfer", "To dark store", "Priority", "Requested", "Approved", "Dispatched", "Received", "Status"],
    rows: {
      All: [
        ["TR-2293", "DS-03 HSR Layout", "Normal", "290", "290", "—", "—", b("Approved", "blue")],
        ["TR-2292", "DS-02 Koramangala", "High", "360", "340", "—", "—", b("Picking", "amber")],
        ["TR-2291", "DS-04 Whitefield", "High", "480", "480", "480", "—", b("Delayed", "red")],
        ["TR-2290", "DS-01 Indiranagar", "Normal", "512", "512", "512", "512", b("Completed", "green")],
        ["TR-2289", "DS-05 Jayanagar", "Low", "180", "180", "180", "168", b("Discrepancy", "red")],
        ["TR-2288", "DS-02 Koramangala", "Normal", "410", "410", "410", "410", b("Completed", "green")],
      ] as Row[],
      "Pending approval": [
        ["TR-2295", "DS-01 Indiranagar", "High", "620", "—", "—", "—", b("Pending approval", "amber")],
        ["TR-2294", "DS-05 Jayanagar", "Normal", "240", "—", "—", "—", b("Pending approval", "amber")],
      ] as Row[],
      "In transit": [
        ["TR-2291", "DS-04 Whitefield", "High", "480", "480", "480", "—", b("Delayed", "red")],
        ["TR-2287", "DS-03 HSR Layout", "Normal", "330", "330", "330", "—", b("In transit", "blue")],
      ] as Row[],
      Receiving: [["TR-2286", "DS-02 Koramangala", "Normal", "300", "300", "300", "220", b("Partially received", "amber")]] as Row[],
      Discrepancy: [["TR-2289", "DS-05 Jayanagar", "Low", "180", "180", "180", "168", b("12 short", "red")]] as Row[],
    },
  },
};
