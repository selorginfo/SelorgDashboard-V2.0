import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_ROSTER_ENTRIES } from "@/services/workforce/rosterSeed";
import type { RosterEntry } from "@/types/workforce";
import type { RosterService } from "@/services/workforce/rosterService";

const table = createMockTable<RosterEntry>("selorg.workforce.roster", SEED_ROSTER_ENTRIES);

export const mockRosterService: RosterService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async approveSwap(id) {
    await mockDelay(220);
    let updated: RosterEntry | undefined;
    table.update((rows) =>
      rows.map((r) => {
        if (r.id !== id || r.tab !== "Swap requests") return r;
        updated = { ...r, status: { label: "Approved", tone: "green" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Swap request ${id} not found`);
    return updated;
  },

  async fillGap(id) {
    await mockDelay(220);
    let updated: RosterEntry | undefined;
    table.update((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const assigned = parseInt(r.assigned, 10) + 1;
        const target = parseInt(r.target, 10);
        const gap = Math.max(0, target - assigned);
        updated = {
          ...r,
          assigned: String(assigned),
          gap: String(gap),
          status: gap === 0 ? { label: "Fully staffed", tone: "green" } : r.status,
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Roster entry ${id} not found`);
    return updated;
  },
};
