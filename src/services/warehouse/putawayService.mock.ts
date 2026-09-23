import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_PUTAWAY_TASKS } from "@/services/warehouse/putawaySeed";
import type { PutawayTask } from "@/types/warehouse";
import type { PutawayService } from "@/services/warehouse/putawayService";

const table = createMockTable<PutawayTask>("selorg.warehouse.putaway-tasks", SEED_PUTAWAY_TASKS);

export const mockPutawayService: PutawayService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async confirm(id, assigned) {
    await mockDelay(220);
    let updated: PutawayTask | undefined;
    table.update((rows) =>
      rows.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, assigned, status: { label: "Confirmed", tone: "green" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Putaway task ${id} not found`);
    return updated;
  },

  async raiseMismatch(id, assigned) {
    await mockDelay(220);
    let updated: PutawayTask | undefined;
    table.update((rows) =>
      rows.map((t) => {
        if (t.id !== id) return t;
        updated = { ...t, assigned, status: { label: "Mismatch flagged", tone: "red" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Putaway task ${id} not found`);
    return updated;
  },
};
