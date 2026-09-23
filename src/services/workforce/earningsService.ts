import type { WorkforceEarning, WorkerKind } from "@/types/workforce";

export interface EarningsService {
  list(kind: WorkerKind): Promise<WorkforceEarning[]>;
  /** Approves a "Pending approval" earning row — the one real mutation on the ledger. */
  approve(kind: WorkerKind, id: string): Promise<WorkforceEarning>;
}
