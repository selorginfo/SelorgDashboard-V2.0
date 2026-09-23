import type { Badge, Tone } from "@/types/common";

/** The "happy path" a transfer advances through. Delayed/Discrepancy/Partially received are
 * exception states a transfer can land in from the source data but never advances out of here —
 * the kanban's Advance button is simply absent for those cards. */
export const TRANSFER_STAGE_ORDER = ["Pending approval", "Approved", "Picking", "In transit", "Completed"] as const;

const STATUS_TONE: Record<string, Tone> = {
  "Pending approval": "amber",
  Approved: "blue",
  Picking: "amber",
  "In transit": "blue",
  Completed: "green",
  Delayed: "red",
  Discrepancy: "red",
  "Partially received": "amber",
};

export function toneForStatus(label: string): Tone {
  return STATUS_TONE[label] ?? "grey";
}

/** Next status in the advance chain, or null if `label` is a terminal/exception state. */
export function nextTransferStatus(label: string): Badge | null {
  const idx = TRANSFER_STAGE_ORDER.indexOf(label as (typeof TRANSFER_STAGE_ORDER)[number]);
  if (idx === -1 || idx === TRANSFER_STAGE_ORDER.length - 1) return null;
  const next = TRANSFER_STAGE_ORDER[idx + 1] as string;
  return { label: next, tone: toneForStatus(next) };
}
