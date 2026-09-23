import type { Badge } from "@/types/common";
import type { CxTicket } from "@/types/commerce";

export interface CxTicketService {
  list(): Promise<CxTicket[]>;
  reply(id: string, text: string): Promise<CxTicket>;
  setStatus(id: string, status: Badge): Promise<CxTicket>;
  assignAgent(id: string, agent: string): Promise<CxTicket>;
  /**
   * Issue a refund against a ticket. `amount` is in rupees; omit it to refund the full
   * order value (the backend decides). Resolves only when the backend recorded the refund.
   */
  refund(id: string, amount?: number, reason?: string): Promise<CxTicket>;
}
