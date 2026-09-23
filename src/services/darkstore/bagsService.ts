import type { Bag } from "@/types/darkstore";

export interface BagsService {
  /** Pass an ISO date string (YYYY-MM-DD) to scope results to that day; omit for today. */
  list(date?: string): Promise<Bag[]>;
  /** Scans a bag onto a staging rack — the one real mutation on this board (request: "Mark
   * racked" action on an "Awaiting rack" card). Moves the bag into the "Racked" tab. */
  markRacked(id: string, rack: string): Promise<Bag>;
}
