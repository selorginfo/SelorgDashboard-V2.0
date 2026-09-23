import { beforeEach, describe, expect, it } from "vitest";
import { mockSupportTicketService } from "@/services/support/supportTicketService.mock";

describe("mockSupportTicketService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("appends a public reply to the ticket thread", async () => {
    const tickets = await mockSupportTicketService.list("rider");
    const ticket = tickets[0]!;
    const startLength = ticket.thread.length;

    const updated = await mockSupportTicketService.reply("rider", ticket.id, "On it, contacting the customer now.", false);
    expect(updated.thread).toHaveLength(startLength + 1);
    expect(updated.thread.at(-1)?.internal).toBe(false);
  });

  it("marks an internal note as not visible to the worker", async () => {
    const tickets = await mockSupportTicketService.list("picker");
    const ticket = tickets[0]!;

    const updated = await mockSupportTicketService.reply("picker", ticket.id, "Escalating to store ops.", true);
    expect(updated.thread.at(-1)?.internal).toBe(true);
  });

  it("updates ticket status independently per worker kind", async () => {
    const riderTickets = await mockSupportTicketService.list("rider");
    const rider = riderTickets[0]!;

    const updated = await mockSupportTicketService.setStatus("rider", rider.id, { label: "Resolved", tone: "green" });
    expect(updated.status.label).toBe("Resolved");

    const pickerTickets = await mockSupportTicketService.list("picker");
    expect(pickerTickets.find((t) => t.id === rider.id)).toBeUndefined();
  });
});
