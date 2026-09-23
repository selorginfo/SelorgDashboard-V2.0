import type { ExceptionCase } from "@/types/monitoring";
import type { Tone } from "@/types/common";

const s = (label: string, tone: Tone) => ({ label, tone });

/** Reshaped from SYSTEM_CONFIGS.exceptions "All open" + "Resolved" rows (workspace/data/system.ts
 * :22-49) into one canonical, taggable list — the triage board sorts this by urgency client-side
 * instead of re-fetching a different row set per tab. */
export const SEED_EXCEPTIONS: ExceptionCase[] = [
  {
    id: "EXC-3312",
    order: "SEL-104821",
    store: "DS-02 Koramangala",
    type: "Payment failure",
    raisedAt: "18:59",
    owner: "Finance · Latha",
    age: "41 min",
    status: s("SLA breached", "red"),
    category: "Payment",
  },
  {
    id: "EXC-3311",
    order: "SEL-104799",
    store: "DS-03 HSR Layout",
    type: "Delivery failed",
    raisedAt: "18:20",
    owner: "Delivery · Arjun",
    age: "1 h 20 m",
    status: s("SLA breached", "red"),
    category: "Delivery",
  },
  {
    id: "EXC-3310",
    order: "SEL-104815",
    store: "DS-04 Whitefield",
    type: "Missing item",
    raisedAt: "18:47",
    owner: "Store · Sanjay",
    age: "38 min",
    status: s("In progress", "amber"),
    category: "Picking / packing",
  },
  {
    id: "EXC-3309",
    order: "SEL-104824",
    store: "DS-02 Koramangala",
    type: "Order stuck",
    raisedAt: "18:52",
    owner: "Ops · Nisha",
    age: "33 min",
    status: s("In progress", "amber"),
    category: "Order stuck",
  },
  {
    id: "EXC-3308",
    order: "SEL-104808",
    store: "DS-01 Indiranagar",
    type: "Rider unavailable",
    raisedAt: "18:34",
    owner: "Delivery · Arjun",
    age: "51 min",
    status: s("Waiting", "blue"),
    category: "Delivery",
  },
  {
    id: "EXC-3307",
    order: "SEL-104805",
    store: "DS-03 HSR Layout",
    type: "Picking failure",
    raisedAt: "18:12",
    owner: "Store · Divya",
    age: "1 h 13 m",
    status: s("Waiting", "blue"),
    category: "Picking / packing",
  },
  {
    id: "EXC-3306",
    order: "SEL-104802",
    store: "DS-05 Jayanagar",
    type: "Payment failure",
    raisedAt: "17:58",
    owner: "Finance · Latha",
    age: "1 h 27 m",
    status: s("In progress", "amber"),
    category: "Payment",
  },
  {
    id: "EXC-3305",
    order: "SEL-104790",
    store: "DS-01 Indiranagar",
    type: "Missing item",
    raisedAt: "17:22",
    owner: "Store · Nisha",
    age: "14 min",
    status: s("Refunded", "green"),
    category: "Resolved",
  },
  {
    id: "EXC-3304",
    order: "SEL-104781",
    store: "DS-02 Koramangala",
    type: "Payment failure",
    raisedAt: "16:58",
    owner: "Finance · Latha",
    age: "9 min",
    status: s("Retried", "green"),
    category: "Resolved",
  },
];

/** Reassignment quick-picks — the distinct owners seen across the current exception pool. */
export const EXCEPTION_OWNER_OPTIONS = [
  "Ops · Nisha",
  "Store · Sanjay",
  "Store · Divya",
  "Store · Nisha",
  "Finance · Latha",
  "Delivery · Arjun",
];
