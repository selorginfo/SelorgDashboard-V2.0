import type { PayoutRun } from "@/types/workforce";

export interface PayoutsService {
  list(): Promise<PayoutRun[]>;
  /** Approves/releases a "Current run" row — the one real mutation on the payouts board. */
  approveRun(id: string): Promise<PayoutRun>;
}
