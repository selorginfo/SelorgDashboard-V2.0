import type { RosterEntry } from "@/types/workforce";

export interface RosterService {
  list(): Promise<RosterEntry[]>;
  /** Approves a swap request. */
  approveSwap(id: string): Promise<RosterEntry>;
  /** Assigns one more person to close part of the gap on an understaffed shift. */
  fillGap(id: string): Promise<RosterEntry>;
}
