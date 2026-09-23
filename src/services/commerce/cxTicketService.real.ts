import { api } from "@/lib/apiClient";
import type { CxTicket } from "@/types/commerce";
import type { Badge } from "@/types/common";
import type { CxTicketService } from "./cxTicketService";

export const realCxTicketService: CxTicketService = {
  async list(): Promise<CxTicket[]> {
    const res = await api.get<{ list?: CxTicket[] } | CxTicket[]>("/api/v1/admin/support/tickets");
    if (Array.isArray(res)) return res;
    return (res as { list?: CxTicket[] }).list ?? [];
  },

  async reply(id: string, text: string): Promise<CxTicket> {
    return api.post<CxTicket>(`/api/v1/admin/support/tickets/${id}/notes`, { text });
  },

  async setStatus(id: string, status: Badge): Promise<CxTicket> {
    return api.patch<CxTicket>(`/api/v1/admin/support/tickets/${id}`, { status });
  },

  async assignAgent(id: string, agent: string): Promise<CxTicket> {
    return api.post<CxTicket>(`/api/v1/admin/support/tickets/${id}/assign`, { agent });
  },

  async refund(id: string, amount?: number, reason?: string): Promise<CxTicket> {
    return api.post<CxTicket>(`/api/v1/admin/support/tickets/${id}/refund`, {
      ...(amount !== undefined ? { amount } : {}),
      ...(reason ? { reason } : {}),
    });
  },
};
