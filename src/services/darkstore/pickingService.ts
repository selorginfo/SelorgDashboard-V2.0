import type { PickingOrder } from "@/types/darkstore";

export interface PickingService {
  /** Pass an ISO date string (YYYY-MM-DD) to scope results to that day; omit for today. */
  list(date?: string): Promise<PickingOrder[]>;
  /** Hands a queued or in-progress order to a different picker — the one real mutation on this
   * board (request: "Reassign picker" action on a queue card). A "Pending" order also moves to
   * "Assigned" once it has a named picker. */
  reassignPicker(id: string, picker: string): Promise<PickingOrder>;
}
