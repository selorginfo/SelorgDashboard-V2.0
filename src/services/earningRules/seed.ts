import type { EarningRule } from "@/types/earningRule";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Verbatim from the approved design's Earning Rules screen (dc.html ~6150-6182). */
export const SEED_EARNING_RULES: EarningRule[] = [
  { id: "RUL-101", name: "RUL-101 Base delivery", appliesTo: "Rider", component: "Base order earning", condition: "Every completed delivery", amount: "₹32", scope: "Global", version: "v4", status: s("Active", "green") },
  { id: "RUL-102", name: "RUL-102 Distance slab", appliesTo: "Rider", component: "Distance component", condition: "Distance over 3 km", amount: "₹6 per km", scope: "Bengaluru", version: "v2", status: s("Active", "green") },
  { id: "RUL-103", name: "RUL-103 Peak hour", appliesTo: "Rider", component: "Peak incentive", condition: "18:00–21:00", amount: "₹15 per order", scope: "Global", version: "v3", status: s("Active", "green"), conflictWith: "RUL-105" },
  { id: "RUL-104", name: "RUL-104 Late penalty", appliesTo: "Rider", component: "Deduction", condition: "Delivery over promise by 10 min", amount: "₹10", scope: "Global", version: "v2", status: s("Active", "green") },
  { id: "RUL-105", name: "RUL-105 Monsoon incentive", appliesTo: "Rider", component: "Peak incentive", condition: "Rain flag active", amount: "₹20 per order", scope: "Bengaluru", version: "v1", status: s("Starts 01 Sep", "blue"), conflictWith: "RUL-103" },
  { id: "RUL-201", name: "RUL-201 Base pick", appliesTo: "Picker", component: "Base order earning", condition: "Every completed pick", amount: "₹15", scope: "Global", version: "v5", status: s("Active", "green") },
  { id: "RUL-202", name: "RUL-202 Item component", appliesTo: "Picker", component: "Item component", condition: "Over 20 items in an order", amount: "₹0.50 per item", scope: "Global", version: "v2", status: s("Active", "green") },
  { id: "RUL-203", name: "RUL-203 Accuracy bonus", appliesTo: "Picker", component: "Performance incentive", condition: "Accuracy above 98%", amount: "₹400 per week", scope: "Global", version: "v3", status: s("Active", "green") },
  { id: "RUL-204", name: "RUL-204 Shift completion", appliesTo: "Picker", component: "Bonus", condition: "Full shift completed", amount: "₹120", scope: "DS-02 Koramangala", version: "v1", status: s("Active", "green") },
  { id: "RUL-205", name: "RUL-205 Mis-pick deduction", appliesTo: "Picker", component: "Deduction", condition: "Wrong item scanned", amount: "₹20", scope: "Global", version: "v1", status: s("Active", "green") },
  { id: "RUL-206", name: "RUL-206 Festive bonus", appliesTo: "Picker", component: "Bonus", condition: "Onam week shifts", amount: "₹250", scope: "Global", version: "v1", status: s("Starts 01 Sep", "blue") },
];
