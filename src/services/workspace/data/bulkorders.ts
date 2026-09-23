import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import { b, kpis, type Row } from "./helpers";

export const BULK_ORDERS_CONFIGS: Partial<Record<ModuleId, WorkspaceConfig>> = {
  "bulk-dispatch": {
    hint: "Load planning for bulk B2B dispatches — vehicle assignment, bag loading and route confirmation",
    flow: [],
    kpis: kpis([
      ["5", "Loads today"],
      ["3", "Assigned"],
      ["1", "In progress"],
      ["42", "Bags to load"],
      ["3", "Vehicles"],
      ["96%", "On time"],
    ]),
    tabs: ["Today's loads", "Assigned", "Completed"],
    columns: ["Load plan", "Vehicle", "Driver", "Origin", "Destination", "Bags", "Weight", "Status"],
    rows: {
      "Today's loads": [
        ["LP-2210", "KA-05-AB-1122", "Raju Naik", "WH-01 Bommasandra", "Zomato Hyperpure, BTM", "18", "480 kg", b("In progress", "amber")],
        ["LP-2211", "KA-05-AC-4488", "Suresh Gowda", "DS-02 Koramangala", "FreshMenu, Marathahalli", "12", "310 kg", b("Assigned", "blue")],
        ["LP-2212", "KA-01-AK-7710", "Ravi Shankar", "WH-01 Bommasandra", "Swiggy Stores, Indiranagar", "22", "620 kg", b("Loading", "amber")],
        ["LP-2213", "KA-05-AB-1122", "Raju Naik", "WH-01 Bommasandra", "Rebel Foods, Koramangala", "8", "190 kg", b("Scheduled", "grey")],
      ] as Row[],
      Assigned: [
        ["LP-2211", "KA-05-AC-4488", "Suresh Gowda", "DS-02 Koramangala", "FreshMenu, Marathahalli", "12", "310 kg", b("Assigned", "blue")],
        ["LP-2212", "KA-01-AK-7710", "Ravi Shankar", "WH-01 Bommasandra", "Swiggy Stores, Indiranagar", "22", "620 kg", b("Loading", "amber")],
        ["LP-2213", "KA-05-AB-1122", "Raju Naik", "WH-01 Bommasandra", "Rebel Foods, Koramangala", "8", "190 kg", b("Assigned", "blue")],
      ] as Row[],
      Completed: [
        ["LP-2209", "KA-05-AB-1122", "Raju Naik", "WH-01 Bommasandra", "BigBasket Pro, Whitefield", "24", "680 kg", b("Delivered", "green")],
        ["LP-2208", "KA-05-AC-4488", "Suresh Gowda", "DS-01 Indiranagar", "Metro Cash & Carry, Yeshwanthpur", "16", "420 kg", b("Delivered", "green")],
        ["LP-2207", "KA-01-AK-7710", "Ravi Shankar", "WH-01 Bommasandra", "Licious B2B, Whitefield", "10", "240 kg", b("Delivered", "green")],
      ] as Row[],
    },
  },

  "bulk-track": {
    hint: "Real-time consignment visibility from dispatch to delivery confirmation",
    flow: [],
    kpis: kpis([
      ["8", "Active consignments"],
      ["3", "In transit"],
      ["2", "Out for delivery"],
      ["1", "Delayed", "var(--red-tx)"],
      ["2", "Delivered today"],
      ["98%", "On time"],
    ]),
    tabs: ["Active", "In transit", "Delivered", "Exceptions"],
    columns: ["Consignment", "Client", "Origin", "Destination", "Vehicle", "Dispatched", "ETA", "Status"],
    rows: {
      Active: [
        ["CON-8810", "Zomato Hyperpure", "WH-01 Bommasandra", "BTM Layout", "KA-05-AB-1122", "09:30", "11:00", b("In transit", "blue")],
        ["CON-8811", "FreshMenu Kitchens", "DS-02 Koramangala", "Marathahalli", "KA-05-AC-4488", "10:15", "11:30", b("Out for delivery", "amber")],
        ["CON-8812", "Swiggy Stores", "WH-01 Bommasandra", "Indiranagar", "KA-01-AK-7710", "10:45", "12:00", b("Loading", "amber")],
        ["CON-8813", "Rebel Foods", "DS-03 HSR Layout", "Koramangala", "KA-05-AB-9910", "—", "14:00", b("Scheduled", "grey")],
      ] as Row[],
      "In transit": [
        ["CON-8810", "Zomato Hyperpure", "WH-01 Bommasandra", "BTM Layout", "KA-05-AB-1122", "09:30", "11:00", b("On track", "blue")],
        ["CON-8809", "Metro Cash & Carry", "WH-01 Bommasandra", "Yeshwanthpur", "KA-01-AK-7710", "08:00", "10:30", b("Delayed", "red")],
        ["CON-8808", "BigBasket Pro", "DS-04 Whitefield", "Whitefield KIADB", "KA-05-AC-4488", "09:00", "10:45", b("On track", "blue")],
      ] as Row[],
      Delivered: [
        ["CON-8806", "Licious B2B", "WH-01 Bommasandra", "Whitefield", "KA-05-AB-1122", "07:00", "09:00", b("Delivered", "green")],
        ["CON-8807", "FreshMenu Kitchens", "DS-01 Indiranagar", "Jayanagar", "KA-05-AC-4488", "07:30", "09:15", b("Delivered", "green")],
      ] as Row[],
      Exceptions: [
        ["CON-8809", "Metro Cash & Carry", "WH-01 Bommasandra", "Yeshwanthpur", "KA-01-AK-7710", "08:00", "10:30", b("Delayed 40 min", "red")],
        ["CON-8805", "Rebel Foods", "DS-02 Koramangala", "Koramangala", "KA-05-AB-9910", "06:30", "08:00", b("Partial delivery", "amber")],
      ] as Row[],
    },
  },
};
