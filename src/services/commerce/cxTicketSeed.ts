import { COMMERCE_CONFIGS } from "@/services/workspace/data/commerce";
import type { CxTicket } from "@/types/commerce";
import type { Badge } from "@/types/common";

const CONFIG = COMMERCE_CONFIGS.support;

/** Reshapes the already-transcribed `support` (Commerce/CX) rows into a ticket console list —
 * same "reuse the same transcribed data, reshaped" approach as storesSeed.ts. "Open tickets" and
 * "Resolved" together form the master ticket list; "Escalations" rows describe the same tickets
 * already present in "Open tickets" (just with an escalation-owner agent), so the "Escalations"
 * tab is derived client-side by filtering the master list on status, mirroring how
 * TicketConsolePage derives its tabs rather than duplicating ticket records. Threads aren't part
 * of the design's row data, so each ticket is seeded with a single opening message from the
 * customer, same convention as services/support/seed.ts. */
function buildTickets(): CxTicket[] {
  if (!CONFIG) return [];
  const openRows = CONFIG.rows["Open tickets"] ?? [];
  const resolvedRows = CONFIG.rows.Resolved ?? [];
  const rows = [...openRows, ...resolvedRows];
  return rows.map((row) => {
    const [id, customer, order, issue, channel, agent, age, status] = row;
    return {
      id: id as string,
      customer: customer as string,
      order: order as string,
      issue: issue as string,
      channel: channel as string,
      agent: agent as string,
      age: age as string,
      status: status as Badge,
      thread: [{ from: customer as string, text: issue as string, time: age as string, internal: false }],
    };
  });
}

export const SEED_CX_TICKETS: CxTicket[] = buildTickets();
