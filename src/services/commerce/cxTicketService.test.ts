import { beforeEach, describe, expect, it } from "vitest";
import { mockCxTicketService } from "@/services/commerce/cxTicketService.mock";

describe("mockCxTicketService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends an agent reply to the ticket thread", async () => {
    const tickets = await mockCxTicketService.list();
    const ticket = tickets[0]!;
    const startLength = ticket.thread.length;

    const updated = await mockCxTicketService.reply(ticket.id, "Refund has been initiated, should reflect in 3-5 days.");
    expect(updated.thread).toHaveLength(startLength + 1);
    expect(updated.thread.at(-1)?.internal).toBe(false);
  });

  it("resolves a ticket", async () => {
    const tickets = await mockCxTicketService.list();
    const ticket = tickets[0]!;

    const updated = await mockCxTicketService.setStatus(ticket.id, { label: "Resolved", tone: "green" });
    expect(updated.status.label).toBe("Resolved");
  });

  it("throws for an unknown ticket id", async () => {
    await expect(mockCxTicketService.setStatus("TKT-0000", { label: "Resolved", tone: "green" })).rejects.toThrow();
  });
});
