import { api } from "@/lib/apiClient";
import type { PutawayTask } from "@/types/warehouse";
import type { PutawayService } from "./putawayService";

// Darkstore inbound putaway endpoint (mounted at /api/v1/darkstore)
const BASE = "/api/v1/darkstore/inbound/putaway";

export const realPutawayService: PutawayService = {
  async list(): Promise<PutawayTask[]> {
    const res = await api.get<{ list?: PutawayTask[]; tasks?: PutawayTask[] } | PutawayTask[]>(BASE);
    if (Array.isArray(res)) return res;
    const r = res as { list?: PutawayTask[]; tasks?: PutawayTask[] };
    return r.list ?? r.tasks ?? [];
  },

  async confirm(id: string, assigned: string): Promise<PutawayTask> {
    await api.post(`${BASE}/${id}/assign`, { assigned });
    return api.post<PutawayTask>(`${BASE}/${id}/complete`);
  },

  async raiseMismatch(id: string, assigned: string): Promise<PutawayTask> {
    return api.post<PutawayTask>(`/api/v1/warehouse/inbound/grns/${id}/discrepancy`, { assigned, action: "mismatch" });
  },
};
