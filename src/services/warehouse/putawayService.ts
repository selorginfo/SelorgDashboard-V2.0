import type { PutawayTask } from "@/types/warehouse";

export interface PutawayService {
  list(): Promise<PutawayTask[]>;
  confirm(id: string, assigned: string): Promise<PutawayTask>;
  raiseMismatch(id: string, assigned: string): Promise<PutawayTask>;
}
