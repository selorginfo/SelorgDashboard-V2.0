import { api } from "@/lib/apiClient";
import type { PayoutRun } from "@/types/workforce";
import type { PayoutsService } from "./payoutsService";

export const realPayoutsService: PayoutsService = {
  async list(): Promise<PayoutRun[]> {
    // Vendor payment runs from finance module
    const res = await api.get<{ list?: PayoutRun[]; payments?: PayoutRun[] } | PayoutRun[]>(
      "/api/v1/admin/finance/vendor-payments/payments",
    );
    if (Array.isArray(res)) return res;
    const r = res as { list?: PayoutRun[]; payments?: PayoutRun[] };
    return r.list ?? r.payments ?? [];
  },

  async approveRun(id: string): Promise<PayoutRun> {
    return api.post<PayoutRun>(`/api/v1/admin/finance/vendor-payments/payments/${id}/advance`);
  },
};
