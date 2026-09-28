import type { Badge } from "@/types/common";
import type { WorkerKind } from "@/types/approval";

export type { WorkerKind };

/** A single approved rider or picker on the directory board (rider-dir / picker-dir). */
export interface WorkforcePerson {
  id: string;
  kind: WorkerKind;
  name: string;
  locationLabel: string;
  location: string;
  contactLabel: string;
  contact: string;
  /** Rider only — vehicle + plate. */
  vehicle?: string;
  /** Kind-specific performance figures, e.g. Deliveries today / On-time / Rating for riders,
   * Orders today / Items today / Accuracy / Avg pick for pickers. */
  stats: { label: string; value: string }[];
  status: Badge;
  tab: string;
}

/** One earning-ledger row (rider-earn / picker-earn). `tab` is the ledger view it belongs to —
 * the same earning can appear with a different status under a different view, matching how the
 * approved design's own per-tab tables work (dc.html workforce earnings tabs). */
export interface WorkforceEarning {
  id: string;
  kind: WorkerKind;
  ref: string;
  person: string;
  /** Kind/tab-specific figures between the id and the net amount, e.g. Deliveries, Base,
   * Incentive, Deduction for riders; Orders, Items, Base, Incentive for pickers. */
  metrics: { label: string; value: string }[];
  net: string;
  status: Badge;
  tab: string;
}

/** One row of the combined weekly payout run, spanning both workforces (payouts). */
export interface PayoutRun {
  id: string;
  run: string;
  cycle: string;
  workforce: string;
  people: string;
  gross: string;
  deductions: string;
  net: string;
  status: Badge;
  tab: string;
}

/** A shift template (shifts) — canonical, one row per template; tab membership is computed. */
export interface ShiftTemplate {
  id: string;
  name: string;
  appliesTo: "Picker" | "Rider";
  hours: string;
  days: string;
  breakTime: string;
  headcountTarget: string;
  scope: string;
  status: Badge;
  startTime?: string;
  endTime?: string;
  warehouseKey?: string;
}

/** Live booked/started shift row for Dashboard workforce tracking. */
export interface LiveShiftWorker {
  id: string;
  picker: string;
  role: string;
  darkStore: string;
  shiftName: string;
  hours: string;
  startTime: string;
  endTime: string;
  bookingStatus: string;
  currentStatus: string;
  startedAt: string | null;
  onShift: boolean;
  isOnline: boolean;
}

/** A shift x location staffing row on the roster board (roster). */
export interface RosterEntry {
  id: string;
  shift: string;
  location: string;
  assigned: string;
  target: string;
  confirmed: string;
  gap: string;
  starts: string;
  status: Badge;
  tab: string;
}
