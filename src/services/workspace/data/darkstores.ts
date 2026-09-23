import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { b, kpis, type Row } from "./helpers";

export const DARKSTORE_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  stores: {
    hint: "5 dark stores serving 18 delivery zones",
    flow: [],
    kpis: kpis([
      ["5", "Dark stores"],
      ["1,482", "Orders today"],
      ["4", "Open"],
      ["1", "At risk", "var(--red-tx)"],
      ["94.2%", "Avg SLA"],
      ["11.4 min", "Avg delivery"],
    ]),
    tabs: ["All stores", "At risk", "Low stock"],
    columns: ["Store", "Manager", "Hours", "Capacity", "Active orders", "Pickers", "Inventory", "Status"],
    rows: {
      "All stores": [
        ["DS-01 Indiranagar", "Nisha R.", "07:00 – 23:00", "78%", "386", "6", b("Healthy", "green"), b("Open", "green")],
        ["DS-02 Koramangala", "Arjun P.", "07:00 – 23:00", "94%", "421", "7", b("Healthy", "green"), b("At risk", "red")],
        ["DS-03 HSR Layout", "Divya M.", "07:00 – 23:00", "66%", "298", "5", b("Healthy", "green"), b("Open", "green")],
        ["DS-04 Whitefield", "Sanjay L.", "08:00 – 23:00", "71%", "244", "5", b("Low stock", "amber"), b("Open", "green")],
        ["DS-05 Jayanagar", "Rekha N.", "08:00 – 22:00", "48%", "133", "3", b("Healthy", "green"), b("Open", "green")],
      ] as Row[],
      "At risk": [["DS-02 Koramangala", "Arjun P.", "07:00 – 23:00", "94%", "421", "7", b("Healthy", "green"), b("At risk", "red")]] as Row[],
      "Low stock": [["DS-04 Whitefield", "Sanjay L.", "08:00 – 23:00", "71%", "244", "5", b("Low stock", "amber"), b("Open", "green")]] as Row[],
    },
  },

  "store-inv": {
    hint: "Stock held at dark stores — separate from warehouse inventory",
    flow: [],
    kpis: kpis([
      ["2,840", "SKUs stocked"],
      ["38,120", "Available"],
      ["4,210", "Reserved"],
      ["9", "Out of stock", "var(--red-tx)"],
      ["31", "Low stock", "var(--amber-tx)"],
      ["3", "Incoming transfers"],
    ]),
    tabs: ["All stores", "DS-01", "DS-02", "DS-04", "Out of stock"],
    columns: ["SKU", "Product", "Store", "Available", "Reserved", "Picked today", "Source", "Status"],
    rows: {
      "All stores": [
        ["SEL-1102", "Organic Tomato 500g", "DS-01", "210", "24", "96", "TR-2290", b("Healthy", "green")],
        ["SEL-2214", "Amul Gold Milk 1L", "DS-02", "18", "12", "142", "TR-2288", b("Low", "amber")],
        ["SEL-4415", "Ghee 500ml", "DS-04", "0", "0", "28", "TR-2291", b("Out of stock", "red")],
        ["SEL-1187", "Farm Eggs 12pc", "DS-01", "96", "10", "64", "TR-2290", b("Healthy", "green")],
        ["SEL-4410", "Basmati Rice 5kg", "DS-03", "140", "18", "22", "TR-2287", b("Healthy", "green")],
        ["SEL-2280", "Curd 400g", "DS-05", "34", "6", "58", "TR-2289", b("Low", "amber")],
      ] as Row[],
      "DS-01": [
        ["SEL-1102", "Organic Tomato 500g", "DS-01", "210", "24", "96", "TR-2290", b("Healthy", "green")],
        ["SEL-1187", "Farm Eggs 12pc", "DS-01", "96", "10", "64", "TR-2290", b("Healthy", "green")],
      ] as Row[],
      "DS-02": [["SEL-2214", "Amul Gold Milk 1L", "DS-02", "18", "12", "142", "TR-2288", b("Low", "amber")]] as Row[],
      "DS-04": [["SEL-4415", "Ghee 500ml", "DS-04", "0", "0", "28", "TR-2291", b("Out of stock", "red")]] as Row[],
      "Out of stock": [["SEL-4415", "Ghee 500ml", "DS-04", "0", "0", "28", "TR-2291", b("Out of stock", "red")]] as Row[],
    },
  },

  picking: {
    hint: "Live queue feeding the Picker App — assignment, progress and packing",
    flow: [],
    kpis: kpis([
      ["38", "Pending picking"],
      ["21", "Pending packing"],
      ["17", "Ready"],
      ["26", "Pickers on shift"],
      ["98.1%", "Pick accuracy"],
      ["4.2 min", "Avg pick time"],
    ]),
    tabs: ["Picking queue", "Packing", "Picker performance", "Exceptions"],
    columns: ["Order", "Store", "Picker", "Items", "Picked", "Started", "Elapsed", "Status"],
    rows: {
      "Picking queue": [
        ["SEL-104815", "DS-04 Whitefield", "Deepa K.", "4", "2", "18:44", "3:12", b("In progress", "amber")],
        ["SEL-104823", "DS-01 Indiranagar", "Ravi M.", "7", "0", "—", "—", b("Assigned", "blue")],
        ["SEL-104824", "DS-02 Koramangala", "—", "5", "0", "—", "—", b("Pending", "grey")],
        ["SEL-104821", "DS-02 Koramangala", "Meena T.", "2", "1", "18:58", "9:40", b("Exception", "red")],
      ] as Row[],
      Packing: [
        ["SEL-104818", "DS-03 HSR Layout", "Anita S.", "3", "3", "19:06", "1:48", b("Packing", "amber")],
        ["SEL-104809", "DS-01 Indiranagar", "Anita S.", "2", "2", "18:26", "—", b("Packed", "green")],
      ] as Row[],
      "Picker performance": [
        ["Ravi M.", "DS-01 Indiranagar", "Shift 2", "64 orders", "482 items", "98.9%", "3.8 min", b("Top", "green")],
        ["Deepa K.", "DS-04 Whitefield", "Shift 2", "41 orders", "318 items", "97.2%", "4.6 min", b("Steady", "blue")],
        ["Meena T.", "DS-02 Koramangala", "Shift 2", "38 orders", "260 items", "94.1%", "6.1 min", b("Review", "amber")],
      ] as Row[],
      Exceptions: [
        ["SEL-104821", "DS-02 Koramangala", "Meena T.", "2", "1", "18:58", "9:40", b("Stock not found", "red")],
        ["SEL-104815", "DS-04 Whitefield", "Deepa K.", "4", "2", "18:44", "3:12", b("Missing item", "amber")],
      ] as Row[],
    },
  },

  bags: {
    hint: "Bag barcodes are issued automatically when a bag is assigned to an order — scanning happens in the Picker and HSD apps",
    flow: [
      ["Bag created", "System"],
      ["Bag barcode scanned", "Picker app"],
      ["Products scanned", "Picker app"],
      ["Picking completed", "Picker app"],
      ["Rack barcode scanned", "Picker app"],
      ["Bag racked", "System"],
      ["Ready for rider", "System"],
    ].map(([label, actor]) => ({ label: label as string, actor: actor as string })),
    flowAt: 4,
    kpis: kpis([
      ["38", "Bags being picked"],
      ["21", "Awaiting rack placement", "var(--amber-tx)"],
      ["112", "Bags racked"],
      ["17", "Ready for rider"],
      ["99.6%", "Product scan success"],
      ["6", "Barcode exceptions", "var(--red-tx)"],
    ]),
    tabs: ["Bag queue", "Awaiting rack", "Racked", "Exceptions"],
    columns: ["Bag", "Barcode", "Order", "Dark store", "Picker", "Products scanned", "Rack", "Status"],
    rows: {
      "Bag queue": [
        ["BAG-000982", "890126400982", "ORD-10245", "DS-01 Indiranagar", "Ravi M.", "5 / 6", "—", b("Product verification", "amber")],
        ["BAG-000984", "890126400984", "ORD-10247", "DS-02 Koramangala", "Meena T.", "2 / 4", "—", b("Picking", "amber")],
        ["BAG-000985", "890126400985", "ORD-10248", "DS-03 HSR Layout", "Suresh P.", "0 / 3", "—", b("Waiting", "grey")],
        ["BAG-000986", "890126400986", "ORD-10249", "DS-04 Whitefield", "Deepa K.", "3 / 3", "—", b("Rack pending", "blue")],
      ] as Row[],
      "Awaiting rack": [
        ["BAG-000986", "890126400986", "ORD-10249", "DS-04 Whitefield", "Deepa K.", "3 / 3", "—", b("Rack pending", "blue")],
        ["BAG-000980", "890126400980", "ORD-10243", "DS-01 Indiranagar", "Anita S.", "4 / 4", "—", b("Rack pending", "blue")],
      ] as Row[],
      Racked: [
        ["BAG-000981", "890126400981", "ORD-10244", "DS-01 Indiranagar", "Ravi M.", "4 / 4", "DS01-R05", b("Ready", "green")],
        ["BAG-000979", "890126400979", "ORD-10242", "DS-01 Indiranagar", "Anita S.", "6 / 6", "DS01-R05", b("Ready", "green")],
        ["BAG-000978", "890126400978", "ORD-10241", "DS-02 Koramangala", "Meena T.", "2 / 2", "DS02-R02", b("Collected", "grey")],
      ] as Row[],
      Exceptions: [
        ["BAG-000984", "890126400984", "ORD-10247", "DS-02 Koramangala", "Meena T.", "2 / 4", "—", b("Wrong product scan", "red")],
        ["BAG-001005", "890126401005", "ORD-10250", "DS-03 HSR Layout", "Suresh P.", "0 / 5", "—", b("Wrong bag scanned", "red")],
        ["BAG-000977", "890126400977", "ORD-10240", "DS-05 Jayanagar", "Rekha N.", "3 / 3", "DS05-R01", b("Wrong rack scanned", "amber")],
      ] as Row[],
    },
  },

  racks: {
    hint: "Dark store staging racks where completed order bags are placed — separate from central warehouse racks and bins",
    flow: [
      ["Rack created", "Store manager"],
      ["Barcode generated", "System"],
      ["Label printed", "Store manager"],
      ["Active", "Store"],
      ["Occupied", "Picker app"],
      ["Cleared by rider", "Rider app"],
    ].map(([label, actor]) => ({ label: label as string, actor: actor as string })),
    flowAt: 3,
    kpis: kpis([
      ["42", "Racks"],
      ["38", "Active"],
      ["612", "Bag slots"],
      ["241", "Occupied"],
      ["371", "Available"],
      ["2", "Inactive", "var(--amber-tx)"],
    ]),
    tabs: ["All racks", "By store", "Near capacity", "Inactive"],
    columns: ["Rack", "Barcode", "Dark store", "Zone", "Capacity", "Occupied", "Available", "Status"],
    rows: {
      "All racks": [
        ["DS01-R05", "890127100505", "DS-01 Indiranagar", "Staging A", "20", "12", "8", b("Active", "green")],
        ["DS01-R06", "890127100506", "DS-01 Indiranagar", "Staging A", "20", "4", "16", b("Active", "green")],
        ["DS02-R02", "890127100202", "DS-02 Koramangala", "Staging B", "24", "22", "2", b("Near capacity", "amber")],
        ["DS03-R01", "890127100301", "DS-03 HSR Layout", "Staging A", "16", "9", "7", b("Active", "green")],
        ["DS04-R03", "890127100403", "DS-04 Whitefield", "Cold staging", "12", "3", "9", b("Active", "green")],
        ["DS05-R01", "890127100501", "DS-05 Jayanagar", "Staging A", "16", "0", "16", b("Inactive", "grey")],
      ] as Row[],
      "By store": [
        ["DS-01 Indiranagar", "—", "5 racks", "Staging A, B", "100", "41", "59", b("Healthy", "green")],
        ["DS-02 Koramangala", "—", "6 racks", "Staging A, B", "144", "118", "26", b("Near capacity", "amber")],
        ["DS-03 HSR Layout", "—", "4 racks", "Staging A", "64", "31", "33", b("Healthy", "green")],
        ["DS-04 Whitefield", "—", "4 racks", "Staging, Cold", "56", "24", "32", b("Healthy", "green")],
        ["DS-05 Jayanagar", "—", "3 racks", "Staging A", "48", "12", "36", b("Healthy", "green")],
      ] as Row[],
      "Near capacity": [
        ["DS02-R02", "890127100202", "DS-02 Koramangala", "Staging B", "24", "22", "2", b("92% full", "red")],
        ["DS02-R04", "890127100204", "DS-02 Koramangala", "Staging B", "24", "20", "4", b("83% full", "amber")],
      ] as Row[],
      Inactive: [
        ["DS05-R01", "890127100501", "DS-05 Jayanagar", "Staging A", "16", "0", "16", b("Deactivated", "grey")],
        ["DS03-R04", "890127100304", "DS-03 HSR Layout", "Staging A", "16", "0", "16", b("Maintenance", "amber")],
      ] as Row[],
    },
  },

  scanner: {
    hint: "HSD Scanner fleet — device health, scan activity and exceptions",
    flow: [],
    kpis: kpis([
      ["12", "Scanners"],
      ["10", "Online"],
      ["1", "Offline", "var(--red-tx)"],
      ["1", "Error state", "var(--amber-tx)"],
      ["8,412", "Scans today"],
      ["0.4%", "Scan error rate"],
    ]),
    tabs: ["Devices", "Scan activity", "Exceptions", "Audit"],
    columns: ["Device", "Store", "Operator", "Last activity", "Network", "Last sync", "Scans today", "Status"],
    rows: {
      Devices: [
        ["HSD-04", "DS-01 Indiranagar", "Suresh P.", "19:10", "Wi-Fi strong", "19:10:44", "1,204", b("Active", "green")],
        ["HSD-02", "DS-02 Koramangala", "Meena T.", "19:01", "Wi-Fi weak", "19:01:02", "986", b("Active", "green")],
        ["HSD-06", "DS-03 HSR Layout", "Divya M.", "18:58", "Wi-Fi strong", "18:58:40", "742", b("Idle", "blue")],
        ["HSD-07", "DS-03 HSR Layout", "—", "08:12", "Disconnected", "08:12:19", "12", b("Offline", "red")],
        ["HSD-09", "DS-05 Jayanagar", "Rekha N.", "18:38", "4G", "18:38:11", "410", b("Sync pending", "amber")],
      ] as Row[],
      "Scan activity": [
        ["19:10:44", "DS-01 Indiranagar", "Suresh P.", "Order verify", "SEL-104822", "HSD-04", "1", b("Verified", "green")],
        ["19:10:41", "DS-01 Indiranagar", "Suresh P.", "Bag scan", "BAG-77120", "HSD-04", "1", b("OK", "green")],
        ["19:10:29", "DS-01 Indiranagar", "Suresh P.", "Item scan", "SEL-2214", "HSD-04", "2", b("Short qty", "amber")],
        ["19:01:02", "DS-02 Koramangala", "Meena T.", "Item scan", "SEL-4410", "HSD-02", "1", b("OK", "green")],
      ] as Row[],
      Exceptions: [
        ["19:10:29", "DS-01 Indiranagar", "Suresh P.", "Item scan", "SEL-2214", "HSD-04", "2", b("Wrong item", "red")],
        ["18:44:10", "DS-04 Whitefield", "Deepa K.", "Item scan", "SEL-4415", "HSD-05", "1", b("Invalid barcode", "red")],
        ["18:20:55", "DS-05 Jayanagar", "Rekha N.", "Bag scan", "BAG-77088", "HSD-09", "1", b("Duplicate scan", "amber")],
      ] as Row[],
      Audit: [
        ["19:10:44", "DS-01 Indiranagar", "Suresh P.", "Order verify", "SEL-104822", "HSD-04", "1", b("Accepted", "green")],
        ["18:38:11", "DS-05 Jayanagar", "Rekha N.", "Order verify", "SEL-104811", "HSD-09", "1", b("Accepted", "green")],
        ["08:12:19", "DS-03 HSR Layout", "System", "Heartbeat", "HSD-07", "HSD-07", "0", b("Lost", "red")],
      ] as Row[],
    },
  },

  "ds-overview": {
    hint: "Dark Store Network — 5 Bangalore dark stores supplying 18 delivery zones",
    flow: [],
    kpis: kpis([
      ["5", "Dark stores"],
      ["1,482", "Orders today"],
      ["4", "Open"],
      ["1", "At risk", "var(--red-tx)"],
      ["94.2%", "Avg SLA"],
      ["11.4 min", "Avg delivery"],
    ]),
    tabs: ["Network overview", "At risk", "Performance"],
    columns: ["Store", "Manager", "Orders today", "Pickers", "Inventory", "SLA", "Avg delivery", "Status"],
    rows: {
      "Network overview": [
        ["DS-01 Indiranagar", "Nisha R.", "386", "6", b("Healthy", "green"), "96.2%", "10.8 min", b("Open", "green")],
        ["DS-02 Koramangala", "Arjun P.", "421", "7", b("Healthy", "green"), "88.4%", "13.2 min", b("At risk", "red")],
        ["DS-03 HSR Layout", "Divya M.", "298", "5", b("Healthy", "green"), "95.8%", "11.0 min", b("Open", "green")],
        ["DS-04 Whitefield", "Sanjay L.", "244", "5", b("Low stock", "amber"), "94.1%", "11.6 min", b("Open", "green")],
        ["DS-05 Jayanagar", "Rekha N.", "133", "3", b("Healthy", "green"), "96.8%", "10.4 min", b("Open", "green")],
      ] as Row[],
      "At risk": [
        ["DS-02 Koramangala", "Arjun P.", "421", "7", b("Healthy", "green"), "88.4%", "13.2 min", b("SLA breach risk", "red")],
      ] as Row[],
      Performance: [
        ["DS-01 Indiranagar", "Nisha R.", "386", "6", b("Healthy", "green"), "96.2%", "10.8 min", b("Top performer", "green")],
        ["DS-05 Jayanagar", "Rekha N.", "133", "3", b("Healthy", "green"), "96.8%", "10.4 min", b("Top performer", "green")],
        ["DS-03 HSR Layout", "Divya M.", "298", "5", b("Healthy", "green"), "95.8%", "11.0 min", b("Steady", "blue")],
        ["DS-04 Whitefield", "Sanjay L.", "244", "5", b("Low stock", "amber"), "94.1%", "11.6 min", b("Steady", "blue")],
        ["DS-02 Koramangala", "Arjun P.", "421", "7", b("Healthy", "green"), "88.4%", "13.2 min", b("Review", "amber")],
      ] as Row[],
    },
  },

  "ds-request": {
    hint: "Goods requests from dark stores to the central warehouse — approval and fulfilment tracking",
    flow: [],
    kpis: kpis([
      ["7", "Pending requests"],
      ["3", "Approved"],
      ["2", "In transit"],
      ["1", "Rejected", "var(--red-tx)"],
      ["4", "Urgent", "var(--amber-tx)"],
      ["₹2.8L", "Value"],
    ]),
    tabs: ["Pending", "Approved", "In transit", "Rejected"],
    columns: ["Request", "Store", "SKU", "Product", "Qty requested", "Requested by", "Priority", "Status"],
    rows: {
      Pending: [
        ["REQ-7710", "DS-02 Koramangala", "SEL-2214", "Amul Gold Milk 1L", "480", "Arjun P.", "Urgent", b("Pending approval", "amber")],
        ["REQ-7711", "DS-04 Whitefield", "SEL-4415", "Ghee 500ml", "240", "Sanjay L.", "Urgent", b("Pending approval", "amber")],
        ["REQ-7712", "DS-01 Indiranagar", "SEL-1102", "Organic Tomato 500g", "360", "Nisha R.", "Normal", b("Pending approval", "grey")],
        ["REQ-7713", "DS-03 HSR Layout", "SEL-4410", "Basmati Rice 5kg", "120", "Divya M.", "Low", b("Pending approval", "grey")],
      ] as Row[],
      Approved: [
        ["REQ-7708", "DS-01 Indiranagar", "SEL-1187", "Farm Eggs 12pc", "300", "Nisha R.", "Normal", b("Approved", "green")],
        ["REQ-7709", "DS-05 Jayanagar", "SEL-2280", "Curd 400g", "180", "Rekha N.", "Normal", b("Approved", "green")],
        ["REQ-7707", "DS-02 Koramangala", "SEL-5501", "Chicken Breast 500g", "120", "Arjun P.", "Urgent", b("Approved", "green")],
      ] as Row[],
      "In transit": [
        ["REQ-7705", "DS-04 Whitefield", "SEL-2214", "Amul Gold Milk 1L", "360", "Sanjay L.", "Urgent", b("In transit", "blue")],
        ["REQ-7706", "DS-03 HSR Layout", "SEL-1102", "Organic Tomato 500g", "240", "Divya M.", "Normal", b("In transit", "blue")],
      ] as Row[],
      Rejected: [
        ["REQ-7704", "DS-02 Koramangala", "SEL-4419", "Cold Pressed Oil 1L", "200", "Arjun P.", "Normal", b("Insufficient stock", "red")],
      ] as Row[],
    },
  },

  "ds-receive": {
    hint: "Inbound shipments at dark stores — receiving transfers from the central warehouse",
    flow: [],
    kpis: kpis([
      ["5", "Shipments today"],
      ["2", "Arriving today"],
      ["1", "In receiving"],
      ["1", "Discrepancy", "var(--red-tx)"],
      ["3,240", "Units expected"],
      ["98.1%", "Fill rate"],
    ]),
    tabs: ["Arriving today", "In receiving", "Completed", "Discrepancy"],
    columns: ["Transfer", "From", "Store", "SKUs", "Expected", "Received", "Short", "Status"],
    rows: {
      "Arriving today": [
        ["TR-2291", "WH-01 Bommasandra", "DS-04 Whitefield", "14", "480", "—", "—", b("In transit", "blue")],
        ["TR-2292", "WH-01 Bommasandra", "DS-02 Koramangala", "10", "360", "—", "—", b("Arriving", "blue")],
      ] as Row[],
      "In receiving": [
        ["TR-2290", "WH-01 Bommasandra", "DS-01 Indiranagar", "12", "512", "498", "14", b("Discrepancy", "red")],
      ] as Row[],
      Completed: [
        ["TR-2288", "WH-01 Bommasandra", "DS-02 Koramangala", "9", "410", "410", "0", b("Received", "green")],
        ["TR-2287", "WH-01 Bommasandra", "DS-03 HSR Layout", "8", "330", "330", "0", b("Received", "green")],
        ["TR-2285", "WH-01 Bommasandra", "DS-05 Jayanagar", "6", "180", "178", "2", b("Received", "green")],
      ] as Row[],
      Discrepancy: [
        ["TR-2290", "WH-01 Bommasandra", "DS-01 Indiranagar", "12", "512", "498", "14", b("Short — 14 units", "red")],
      ] as Row[],
    },
  },

  "ds-audit": {
    hint: "Dark store stock audits — cycle counts, discrepancy investigation and accuracy reporting",
    flow: [],
    kpis: kpis([
      ["3", "Audits due"],
      ["1", "In progress"],
      ["8", "Completed this month"],
      ["2,840", "SKUs audited"],
      ["14", "Discrepancies", "var(--amber-tx)"],
      ["99.5%", "Accuracy"],
    ]),
    tabs: ["Due", "In progress", "Completed"],
    columns: ["Audit", "Store", "Zone", "SKUs", "Scanned", "Discrepancy", "Auditor", "Status"],
    rows: {
      Due: [
        ["AUD-DS-088", "DS-02 Koramangala", "Chilled section", "86", "—", "—", "Arjun P.", b("Due today", "red")],
        ["AUD-DS-089", "DS-04 Whitefield", "Dry goods", "120", "—", "—", "Sanjay L.", b("Due today", "amber")],
        ["AUD-DS-090", "DS-03 HSR Layout", "Produce", "74", "—", "—", "Divya M.", b("Due tomorrow", "grey")],
      ] as Row[],
      "In progress": [
        ["AUD-DS-087", "DS-01 Indiranagar", "Dairy section", "64", "48", "2", "Nisha R.", b("In progress", "amber")],
      ] as Row[],
      Completed: [
        ["AUD-DS-086", "DS-05 Jayanagar", "Full store", "280", "280", "1", "Rekha N.", b("Completed", "green")],
        ["AUD-DS-085", "DS-03 HSR Layout", "Staples zone", "190", "190", "0", "Divya M.", b("Completed", "green")],
        ["AUD-DS-084", "DS-01 Indiranagar", "Produce zone", "140", "140", "3", "Nisha R.", b("Completed", "green")],
      ] as Row[],
    },
  },

  "scan-history": {
    hint: "Every barcode scan event received from the Picker and HSD Scanner apps — immutable",
    flow: [
      ["Scan captured", "Device"],
      ["Barcode identified", "Backend"],
      ["Scan validated", "Backend"],
      ["Event stored", "Backend"],
      ["Relationship updated", "Backend"],
    ].map(([label, actor]) => ({ label: label as string, actor: actor as string })),
    flowAt: 3,
    kpis: kpis([
      ["8,412", "Scans today"],
      ["8,378", "Successful"],
      ["34", "Failed", "var(--red-tx)"],
      ["6,204", "Product scans"],
      ["1,486", "Bag scans"],
      ["722", "Rack scans"],
    ]),
    tabs: ["All scans", "Product scans", "Bag scans", "Rack scans", "Failures"],
    columns: ["Time", "Barcode", "Entity", "Reference", "Order", "Picker", "Device", "Result"],
    rows: {
      "All scans": [
        ["19:10:44", "890127100505", "Rack", "DS01-R05", "ORD-10244", "Ravi M.", "HSD-04", b("Bag racked", "green")],
        ["19:10:41", "890126400981", "Bag", "BAG-000981", "ORD-10244", "Ravi M.", "HSD-04", b("Verified", "green")],
        ["19:10:29", "890126402214", "Product", "Amul Gold Milk 1L", "ORD-10245", "Ravi M.", "HSD-04", b("Short qty", "amber")],
        ["19:10:12", "890126401102", "Product", "Organic Tomato 500g", "ORD-10245", "Ravi M.", "HSD-04", b("Matched", "green")],
        ["19:08:55", "890126409999", "Product", "Unregistered", "ORD-10247", "Meena T.", "HSD-02", b("Unknown barcode", "red")],
        ["19:06:20", "890126400982", "Bag", "BAG-000982", "ORD-10245", "Ravi M.", "HSD-04", b("Bag opened", "green")],
      ] as Row[],
      "Product scans": [
        ["19:10:29", "890126402214", "Product", "Amul Gold Milk 1L", "ORD-10245", "Ravi M.", "HSD-04", b("Short qty", "amber")],
        ["19:10:12", "890126401102", "Product", "Organic Tomato 500g", "ORD-10245", "Ravi M.", "HSD-04", b("Matched", "green")],
        ["19:04:02", "890126404410", "Product", "Basmati Rice 5kg", "ORD-10247", "Meena T.", "HSD-02", b("Wrong product", "red")],
      ] as Row[],
      "Bag scans": [
        ["19:10:41", "890126400981", "Bag", "BAG-000981", "ORD-10244", "Ravi M.", "HSD-04", b("Verified", "green")],
        ["19:06:20", "890126400982", "Bag", "BAG-000982", "ORD-10245", "Ravi M.", "HSD-04", b("Bag opened", "green")],
        ["18:58:14", "890126401005", "Bag", "BAG-001005", "ORD-10250", "Suresh P.", "HSD-06", b("Wrong bag", "red")],
      ] as Row[],
      "Rack scans": [
        ["19:10:44", "890127100505", "Rack", "DS01-R05", "ORD-10244", "Ravi M.", "HSD-04", b("Bag racked", "green")],
        ["18:52:31", "890127100202", "Rack", "DS02-R02", "ORD-10241", "Meena T.", "HSD-02", b("Bag racked", "green")],
        ["18:40:09", "890127100508", "Rack", "DS01-R08", "ORD-10240", "Rekha N.", "HSD-09", b("Wrong rack", "amber")],
      ] as Row[],
      Failures: [
        ["19:08:55", "890126409999", "Product", "Unregistered", "ORD-10247", "Meena T.", "HSD-02", b("Unknown barcode", "red")],
        ["19:04:02", "890126404410", "Product", "Basmati Rice 5kg", "ORD-10247", "Meena T.", "HSD-02", b("Wrong product", "red")],
        ["18:58:14", "890126401005", "Bag", "BAG-001005", "ORD-10250", "Suresh P.", "HSD-06", b("Wrong bag", "red")],
        ["18:44:10", "890126404415", "Product", "Ghee 500ml", "ORD-10249", "Deepa K.", "HSD-05", b("Duplicate scan", "amber")],
        ["18:40:09", "890127100508", "Rack", "DS01-R08", "ORD-10240", "Rekha N.", "HSD-09", b("Wrong rack", "amber")],
        ["18:22:47", "890127100304", "Rack", "DS03-R04", "ORD-10238", "Suresh P.", "HSD-06", b("Inactive barcode", "red")],
      ] as Row[],
    },
  },
};
