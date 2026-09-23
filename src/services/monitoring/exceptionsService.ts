import type { ExceptionCase } from "@/types/monitoring";

export interface ExceptionsService {
  list(): Promise<ExceptionCase[]>;
  /** Assigns or reassigns the owner working an exception — the one real mutation on the triage
   * board (spec: "Assign to me" / "Reassign owner"). */
  assignOwner(id: string, owner: string): Promise<ExceptionCase>;
}
