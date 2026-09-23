import type { Badge } from "@/types/common";
import type { WorkforcePerson, WorkerKind } from "@/types/workforce";

export interface DirectoryService {
  list(kind: WorkerKind): Promise<WorkforcePerson[]>;
  /** Suspends or reactivates a person — the one real mutation on the directory board. */
  setStatus(kind: WorkerKind, id: string, status: Badge, tab: string): Promise<WorkforcePerson>;
}
