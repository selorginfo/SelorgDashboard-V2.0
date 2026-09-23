import type { SupportTicket, SupportWorkerKind } from "@/types/supportTicket";

export interface SupportTicketService {
  list(kind: SupportWorkerKind): Promise<SupportTicket[]>;
  reply(kind: SupportWorkerKind, id: string, text: string, internal: boolean): Promise<SupportTicket>;
  assignAgent(kind: SupportWorkerKind, id: string, agent: string): Promise<SupportTicket>;
  setStatus(kind: SupportWorkerKind, id: string, status: SupportTicket["status"]): Promise<SupportTicket>;
  create(
    kind: SupportWorkerKind,
    input: { subject: string; description?: string; category?: string; priority?: string; customerName: string; customerEmail: string },
  ): Promise<SupportTicket>;
}
