import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_CX_TICKETS } from "@/services/commerce/cxTicketSeed";
import type { CxTicket } from "@/types/commerce";
import type { CxTicketService } from "@/services/commerce/cxTicketService";

const table = createMockTable<CxTicket>("selorg.commerce.support", SEED_CX_TICKETS);

function update(id: string, patch: Partial<CxTicket>): CxTicket {
  let updated: CxTicket | undefined;
  table.update((rows) =>
    rows.map((t) => {
      if (t.id !== id) return t;
      updated = { ...t, ...patch };
      return updated;
    })
  );
  if (!updated) throw new MockApiError(`Ticket ${id} not found`);
  return updated;
}

export const mockCxTicketService: CxTicketService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async reply(id, text) {
    await mockDelay(260);
    const ticket = table.all().find((t) => t.id === id);
    if (!ticket) throw new MockApiError(`Ticket ${id} not found`);
    const message = { from: "Arjun P.", text, time: "Just now", internal: false };
    return update(id, { thread: [...ticket.thread, message] });
  },

  async setStatus(id, status) {
    await mockDelay(200);
    return update(id, { status });
  },

  async assignAgent(id, agent) {
    await mockDelay(200);
    return update(id, { agent });
  },

  async refund(id, amount, reason) {
    await mockDelay(320);
    const ticket = table.all().find((t) => t.id === id);
    if (!ticket) throw new MockApiError(`Ticket ${id} not found`);
    const note = {
      from: "System",
      text: `Refund initiated${amount !== undefined ? ` for ₹${amount}` : ""}${reason ? ` — ${reason}` : ""}`,
      time: "Just now",
      internal: true,
    };
    return update(id, { thread: [...ticket.thread, note] });
  },
};
