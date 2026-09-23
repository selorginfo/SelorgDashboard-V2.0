import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_RIDER_TICKETS, SEED_PICKER_TICKETS } from "@/services/support/seed";
import type { SupportTicket, SupportWorkerKind } from "@/types/supportTicket";
import type { SupportTicketService } from "@/services/support/supportTicketService";

const riderTable = createMockTable<SupportTicket>("selorg.support.rider", SEED_RIDER_TICKETS);
const pickerTable = createMockTable<SupportTicket>("selorg.support.picker", SEED_PICKER_TICKETS);

function tableFor(kind: SupportWorkerKind) {
  return kind === "rider" ? riderTable : pickerTable;
}

function update(kind: SupportWorkerKind, id: string, patch: Partial<SupportTicket>): SupportTicket {
  let updated: SupportTicket | undefined;
  tableFor(kind).update((rows) =>
    rows.map((t) => {
      if (t.id !== id) return t;
      updated = { ...t, ...patch };
      return updated;
    })
  );
  if (!updated) throw new MockApiError(`Ticket ${id} not found`);
  return updated;
}

export const mockSupportTicketService: SupportTicketService = {
  async list(kind) {
    await mockDelay();
    return tableFor(kind).all();
  },

  async reply(kind, id, text, internal) {
    await mockDelay(260);
    const ticket = tableFor(kind).all().find((t) => t.id === id);
    if (!ticket) throw new MockApiError(`Ticket ${id} not found`);
    const message = { from: "Arun K.", text, time: "Just now", internal };
    return update(kind, id, { thread: [...ticket.thread, message] });
  },

  async assignAgent(kind, id, agent) {
    await mockDelay(200);
    return update(kind, id, { agent });
  },

  async setStatus(kind, id, status) {
    await mockDelay(200);
    return update(kind, id, { status });
  },

  async create(kind, input) {
    await mockDelay(200);
    const ticket: SupportTicket = {
      id: `TKT-M${Date.now().toString().slice(-5)}`,
      person: input.customerName,
      issue: input.subject,
      context: input.description || "",
      priority: input.priority === "high" ? "P1" : "P2",
      agent: "Unassigned",
      age: "Just now",
      status: { label: "Open", tone: "amber" },
      thread: [],
    };
    tableFor(kind).update((rows) => [ticket, ...rows]);
    return ticket;
  },
};
