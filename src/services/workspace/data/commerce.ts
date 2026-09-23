import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { b, kpis, type Row } from "./helpers";

export const COMMERCE_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  customers: {
    hint: "Profile, orders, addresses, wallet, refunds and tickets in one record",
    flow: [],
    kpis: kpis([
      ["48,210", "Total customers"],
      ["3,904", "Ordered this week"],
      ["₹684", "Avg order value"],
      ["62%", "Repeat rate"],
      ["₹8.4L", "Wallet float"],
      ["2.1%", "Refund rate"],
    ]),
    tabs: ["Customers", "Wallets", "Activity", "Refund history"],
    columns: ["Customer", "Phone", "Orders", "Total spend", "Last order", "Wallet", "Tickets", "Status"],
    rows: {
      Customers: [
        ["Priya Nair", "+91 98450 21118", "64", "₹48,210", "Today 19:02", "₹420", "0", b("Active", "green")],
        ["Rahul Desai", "+91 98860 44210", "28", "₹21,480", "Today 18:58", "₹0", "2", b("Payment issue", "red")],
        ["Anjali Rao", "+91 99000 71122", "41", "₹32,110", "Today 18:51", "₹180", "1", b("Active", "green")],
        ["Karthik S.", "+91 96320 55019", "12", "₹9,640", "Today 18:44", "₹0", "0", b("New", "blue")],
        ["Fatima Sheikh", "+91 97400 33218", "88", "₹64,900", "Today 18:30", "₹1,240", "0", b("VIP", "green")],
        ["Manoj Iyer", "+91 90080 66512", "19", "₹14,220", "Today 17:52", "₹0", "1", b("At risk", "amber")],
      ] as Row[],
      Wallets: [
        ["Fatima Sheikh", "+91 97400 33218", "88", "₹64,900", "Today", "₹1,240", "Refund credit", b("Active", "green")],
        ["Priya Nair", "+91 98450 21118", "64", "₹48,210", "Today", "₹420", "Cashback", b("Active", "green")],
        ["Anjali Rao", "+91 99000 71122", "41", "₹32,110", "Today", "₹180", "Refund credit", b("Active", "green")],
      ] as Row[],
      Activity: [
        ["Priya Nair", "Order placed", "SEL-104822", "₹1,284", "19:02", "Customer app", "—", b("Out for delivery", "blue")],
        ["Rahul Desai", "Payment failed", "SEL-104821", "₹2,140", "18:59", "Card", "Retry sent", b("Exception", "red")],
        ["Manoj Iyer", "Return raised", "SEL-104799", "₹980", "18:24", "Support", "RET-2210", b("Approved", "green")],
      ] as Row[],
      "Refund history": [
        ["Manoj Iyer", "+91 90080 66512", "19", "₹980", "Today", "UPI", "RFD-5510", b("Processing", "amber")],
        ["Sneha Gupta", "+91 99450 12277", "34", "₹320", "Today", "Card", "RFD-5509", b("Completed", "green")],
        ["Rahul Desai", "+91 98860 44210", "28", "₹2,140", "Yesterday", "Card", "RFD-5508", b("Failed", "red")],
      ] as Row[],
    },
  },

  payments: {
    hint: "Transactions, COD reconciliation, refunds and rider settlements",
    flow: [],
    kpis: kpis([
      ["₹9.84L", "Revenue today"],
      ["₹6.42L", "Online"],
      ["₹3.42L", "COD"],
      ["18", "Failed payments", "var(--red-tx)"],
      ["₹41.2K", "Refunds today", "var(--amber-tx)"],
      ["₹1.1L", "Pending settlement"],
    ]),
    tabs: ["Transactions", "COD reconciliation", "Refunds", "Settlements"],
    columns: ["Reference", "Order", "Customer", "Amount", "Method", "Gateway ref", "Time", "Status"],
    rows: {
      Transactions: [
        ["TXN-99120", "SEL-104822", "Priya Nair", "₹1,284", "UPI", "rzp_Kx8812", "19:02", b("Success", "green")],
        ["TXN-99119", "SEL-104821", "Rahul Desai", "₹2,140", "Card", "rzp_Kx8809", "18:58", b("Failed", "red")],
        ["TXN-99118", "SEL-104818", "Anjali Rao", "₹864", "Wallet", "wal_44120", "18:51", b("Success", "green")],
        ["TXN-99115", "SEL-104815", "Karthik S.", "₹1,690", "COD", "—", "18:44", b("Pending", "amber")],
        ["TXN-99111", "SEL-104811", "Fatima Sheikh", "₹742", "UPI", "rzp_Kx8790", "18:30", b("Success", "green")],
      ] as Row[],
      "COD reconciliation": [
        ["COD-2210", "—", "Vikram J.", "₹12,840", "Expected", "—", "Today", b("Collected", "green")],
        ["COD-2209", "—", "Imran A.", "₹9,410", "Expected", "—", "Today", b("Short ₹200", "red")],
        ["COD-2208", "—", "Naveen R.", "₹11,220", "Deposited", "BNK-8812", "Today", b("Reconciled", "green")],
      ] as Row[],
      Refunds: [
        ["RFD-5510", "SEL-104799", "Manoj Iyer", "₹980", "UPI", "rzp_Kx8712", "Today", b("Processing", "amber")],
        ["RFD-5509", "SEL-104780", "Sneha Gupta", "₹320", "Card", "rzp_Kx8688", "Today", b("Completed", "green")],
        ["RFD-5508", "SEL-104772", "Rahul Desai", "₹2,140", "Card", "rzp_Kx8640", "Yesterday", b("Failed", "red")],
      ] as Row[],
      Settlements: [
        ["STL-1120", "—", "Vikram J.", "₹9,470", "Weekly payout", "utr_88120", "Mon", b("Settled", "green")],
        ["STL-1119", "—", "Imran A.", "₹7,780", "Weekly payout", "—", "Mon", b("Pending", "amber")],
      ] as Row[],
    },
  },

  returns: {
    hint: "Return request → approval → pickup → received → QC → refund → closed",
    flow: [
      "Requested",
      "Approved",
      "Pickup pending",
      "Picked up",
      "Received",
      "QC",
      "Refund",
      "Completed",
    ].map((label) => ({ label, actor: "" })),
    kpis: kpis([
      ["38", "Open returns"],
      ["12", "Awaiting QC", "var(--amber-tx)"],
      ["9", "Pickup pending"],
      ["₹41.2K", "Refunded today"],
      ["4", "Failed refunds", "var(--red-tx)"],
      ["2.1%", "Return rate"],
    ]),
    tabs: ["Return requests", "Pickup & QC", "Refund workflow", "Reasons", "Completed"],
    columns: ["Return", "Order", "Customer", "Item", "Reason", "Amount", "Method", "Status"],
    rows: {
      "Return requests": [
        ["RET-2210", "SEL-104799", "Manoj Iyer", "Mango Alphonso 1kg", "Quality issue", "₹560", "UPI", b("Approved", "green")],
        ["RET-2209", "SEL-104780", "Sneha Gupta", "Chicken Breast 500g", "Damaged item", "₹320", "Card", b("Requested", "amber")],
        ["RET-2208", "SEL-104772", "Rahul Desai", "Cold Pressed Oil 1L", "Wrong item", "₹360", "Card", b("Pickup pending", "blue")],
        ["RET-2207", "SEL-104766", "Priya Nair", "Amul Gold Milk 1L", "Missing item", "₹68", "Wallet", b("Refunded", "green")],
        ["RET-2206", "SEL-104760", "Karthik S.", "Toor Dal 1kg", "Customer cancellation", "₹280", "COD", b("Rejected", "red")],
      ] as Row[],
      "Pickup & QC": [
        ["RET-2208", "SEL-104772", "Rahul Desai", "Cold Pressed Oil 1L", "Wrong item", "₹360", "Rider · Imran A.", b("Pickup pending", "blue")],
        ["RET-2205", "SEL-104755", "Anjali Rao", "Curd 400g", "Quality issue", "₹90", "Received", b("In QC", "amber")],
        ["RET-2204", "SEL-104750", "Vikas Menon", "Farm Eggs 12pc", "Damaged item", "₹142", "Received", b("QC passed", "green")],
      ] as Row[],
      "Refund workflow": [
        ["RFD-5510", "SEL-104799", "Manoj Iyer", "Full order", "Quality issue", "₹980", "UPI", b("Processing", "amber")],
        ["RFD-5509", "SEL-104780", "Sneha Gupta", "1 item", "Damaged item", "₹320", "Card", b("Completed", "green")],
        ["RFD-5508", "SEL-104772", "Rahul Desai", "Full order", "Payment reversal", "₹2,140", "Card", b("Failed", "red")],
        ["RFD-5507", "SEL-104766", "Priya Nair", "1 item", "Missing item", "₹68", "Wallet", b("Completed", "green")],
      ] as Row[],
      Reasons: [
        ["Missing item", "—", "—", "—", "Picking short", "₹8.4K", "32%", b("Top reason", "amber")],
        ["Damaged item", "—", "—", "—", "Handling / transit", "₹6.1K", "24%", b("Watch", "amber")],
        ["Quality issue", "—", "—", "—", "Fresh produce", "₹5.2K", "20%", b("Watch", "amber")],
        ["Wrong item", "—", "—", "—", "Scan mismatch", "₹3.0K", "12%", b("Stable", "green")],
      ] as Row[],
      Completed: [
        ["RET-2207", "SEL-104766", "Priya Nair", "Amul Gold Milk 1L", "Missing item", "₹68", "Wallet", b("Closed", "green")],
        ["RET-2203", "SEL-104742", "Fatima Sheikh", "Onion 2kg", "Quality issue", "₹88", "UPI", b("Closed", "green")],
      ] as Row[],
    },
  },

  support: {
    hint: "Ticket lifecycle — open, assigned, escalated, resolved, closed",
    flow: [],
    kpis: kpis([
      ["64", "Open tickets"],
      ["9", "Escalated", "var(--red-tx)"],
      ["18 min", "First response"],
      ["2.4 h", "Resolution time"],
      ["4.5", "CSAT"],
      ["6%", "Escalation rate"],
    ]),
    tabs: ["Open tickets", "Escalations", "Resolved", "CX analytics"],
    columns: ["Ticket", "Customer", "Order", "Issue", "Channel", "Agent", "Age", "Status"],
    rows: {
      "Open tickets": [
        ["TKT-9912", "Rahul Desai", "SEL-104821", "Payment failed twice", "Chat", "Latha S.", "38 min", b("Escalated", "red")],
        ["TKT-9911", "Manoj Iyer", "SEL-104799", "Delivery not attempted", "Call", "Arjun P.", "1 h 12 m", b("Escalated", "red")],
        ["TKT-9910", "Karthik S.", "SEL-104815", "Ghee missing from order", "Chat", "Divya M.", "26 min", b("Assigned", "amber")],
        ["TKT-9909", "Anjali Rao", "SEL-104818", "Change delivery address", "Chat", "Nisha R.", "14 min", b("Open", "blue")],
        ["TKT-9908", "Priya Nair", "SEL-104822", "Rider unreachable", "Call", "Arjun P.", "9 min", b("Open", "blue")],
      ] as Row[],
      Escalations: [
        ["TKT-9912", "Rahul Desai", "SEL-104821", "Payment failed twice", "Chat", "Finance lead", "38 min", b("L2", "red")],
        ["TKT-9911", "Manoj Iyer", "SEL-104799", "Delivery not attempted", "Call", "Delivery lead", "1 h 12 m", b("L2", "red")],
      ] as Row[],
      Resolved: [
        ["TKT-9905", "Fatima Sheikh", "SEL-104811", "Late delivery", "Chat", "Nisha R.", "22 min", b("Refunded", "green")],
        ["TKT-9904", "Sneha Gupta", "SEL-104803", "Damaged item", "Chat", "Divya M.", "31 min", b("Replaced", "green")],
      ] as Row[],
      "CX analytics": [
        ["Ticket volume", "—", "—", "412 this week", "+8%", "—", "—", b("Watch", "amber")],
        ["First response", "—", "—", "18 min", "−4 min", "—", "—", b("On target", "green")],
        ["CSAT", "—", "—", "4.5 / 5", "+0.1", "—", "—", b("On target", "green")],
        ["Escalation rate", "—", "—", "6%", "+1%", "—", "—", b("Watch", "amber")],
      ] as Row[],
    },
  },

  promotions: {
    hint: "Coupon and promotion lifecycle — draft, scheduled, live, expired",
    flow: ["Draft", "Configured", "Scheduled", "Live", "Monitored", "Expired", "Analysed"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["14", "Active coupons"],
      ["6", "Live promotions"],
      ["₹2.8L", "Discount given"],
      ["3.4%", "Conversion lift"],
      ["4", "Scheduled"],
      ["8", "Banners live"],
    ]),
    tabs: ["Coupons", "Promotions", "Banners", "Analytics"],
    columns: ["Code / name", "Type", "Scope", "Value", "Min order", "Usage", "Window", "Status"],
    rows: {
      Coupons: [
        ["SELORG100", "Fixed discount", "All stores", "₹100", "₹599", "2,184 / 5,000", "01–31 Aug", b("Live", "green")],
        ["FIRST50", "First order", "All stores", "50%", "₹299", "908 / 2,000", "Always", b("Live", "green")],
        ["HSR20", "Store offer", "DS-03 HSR Layout", "20%", "₹399", "142 / 500", "20–31 Aug", b("Live", "green")],
        ["FRESH15", "Category", "Fruits & vegetables", "15%", "₹249", "0 / 1,000", "01–07 Sep", b("Scheduled", "blue")],
        ["MONSOON", "Fixed discount", "All stores", "₹75", "₹499", "3,000 / 3,000", "01–15 Aug", b("Expired", "grey")],
      ] as Row[],
      Promotions: [
        ["Dairy Days", "Category discount", "Dairy & eggs", "10%", "—", "4,120 orders", "24–28 Aug", b("Live", "green")],
        ["Weekend Fresh", "Product discount", "24 SKUs", "₹20 off", "₹199", "2,860 orders", "Sat–Sun", b("Live", "green")],
        ["Whitefield Launch", "Store offer", "DS-04 Whitefield", "₹150", "₹699", "640 orders", "01–30 Aug", b("Live", "green")],
        ["Festive Staples", "Category discount", "Staples", "12%", "₹599", "—", "05–15 Sep", b("Draft", "grey")],
      ] as Row[],
      Banners: [
        ["Monsoon Hero", "Home banner", "Customer app", "Slot 1", "—", "118K views", "24–31 Aug", b("Live", "green")],
        ["Dairy Days", "Home banner", "Customer app", "Slot 2", "—", "86K views", "24–28 Aug", b("Live", "green")],
        ["Festive Teaser", "Promotional", "Customer app", "Slot 3", "—", "—", "05 Sep", b("Scheduled", "blue")],
      ] as Row[],
      Analytics: [
        ["SELORG100", "Fixed discount", "All stores", "₹2.18L given", "₹14.2L revenue", "2,184 uses", "Aug", b("ROI 6.5×", "green")],
        ["FIRST50", "First order", "All stores", "₹42K given", "₹2.6L revenue", "908 uses", "Aug", b("ROI 6.2×", "green")],
        ["HSR20", "Store offer", "DS-03", "₹18K given", "₹88K revenue", "142 uses", "Aug", b("ROI 4.9×", "amber")],
      ] as Row[],
    },
  },

  zones: {
    hint: "Serviceability, delivery radius and live coverage across 18 zones",
    flow: ["Zone drawn", "Pincodes mapped", "Store assigned", "Radius set", "SLA set", "Live", "Monitored"].map((label) => ({
      label,
      actor: "",
    })),
    kpis: kpis([
      ["18", "Active zones"],
      ["96%", "Serviceable pincodes"],
      ["2", "Zones over SLA", "var(--red-tx)"],
      ["11.4 min", "Avg delivery"],
      ["48", "Riders deployed"],
      ["3.2 km", "Avg radius"],
    ]),
    tabs: ["Zones", "Serviceability", "Live coverage", "Zone analytics"],
    columns: ["Zone", "Dark store", "Pincodes", "Radius", "Orders today", "Riders", "SLA", "Status"],
    rows: {
      Zones: [
        ["Z-04 Indiranagar E", "DS-01 Indiranagar", "560038, 560008", "3.0 km", "212", "11", "97%", b("Live", "green")],
        ["Z-02 Koramangala", "DS-02 Koramangala", "560095, 560034", "3.5 km", "248", "13", "89%", b("Over SLA", "red")],
        ["Z-07 HSR Sector 1–2", "DS-03 HSR Layout", "560102", "4.0 km", "186", "9", "95%", b("Live", "green")],
        ["Z-11 Whitefield", "DS-04 Whitefield", "560066, 560087", "5.0 km", "164", "8", "92%", b("Live", "green")],
        ["Z-14 Jayanagar", "DS-05 Jayanagar", "560041, 560069", "3.0 km", "98", "5", "98%", b("Live", "green")],
      ] as Row[],
      Serviceability: [
        ["560038", "DS-01 Indiranagar", "Full", "3.0 km", "Yes", "11", "97%", b("Serviceable", "green")],
        ["560103", "DS-03 HSR Layout", "Partial", "4.0 km", "Peak only", "9", "91%", b("Partial", "amber")],
        ["560048", "DS-04 Whitefield", "Full", "5.0 km", "Yes", "8", "92%", b("Serviceable", "green")],
        ["560064", "—", "None", "—", "No", "0", "—", b("Not serviceable", "grey")],
      ] as Row[],
      "Live coverage": [
        ["Z-02 Koramangala", "DS-02 Koramangala", "—", "3.5 km", "36 active", "13 riders", "6 delayed", b("Congested", "red")],
        ["Z-04 Indiranagar E", "DS-01 Indiranagar", "—", "3.0 km", "28 active", "11 riders", "1 delayed", b("Healthy", "green")],
        ["Z-11 Whitefield", "DS-04 Whitefield", "—", "5.0 km", "19 active", "8 riders", "0 delayed", b("Healthy", "green")],
      ] as Row[],
      "Zone analytics": [
        ["Z-02 Koramangala", "DS-02", "—", "—", "248 orders", "₹1.72L", "13.8 min", b("Add riders", "amber")],
        ["Z-04 Indiranagar E", "DS-01", "—", "—", "212 orders", "₹1.48L", "10.2 min", b("Healthy", "green")],
        ["Z-14 Jayanagar", "DS-05", "—", "—", "98 orders", "₹64K", "9.6 min", b("Under-used", "blue")],
      ] as Row[],
    },
  },
};
