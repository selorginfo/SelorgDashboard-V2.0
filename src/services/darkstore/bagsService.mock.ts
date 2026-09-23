import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_BAGS } from "@/services/darkstore/bagsSeed";
import type { Bag } from "@/types/darkstore";
import type { BagsService } from "@/services/darkstore/bagsService";

const table = createMockTable<Bag>("selorg.darkstore.bags", SEED_BAGS);

export const mockBagsService: BagsService = {
  async list(_date?: string) {
    await mockDelay();
    return table.all();
  },

  async markRacked(id, rack) {
    await mockDelay(220);
    let updated: Bag | undefined;
    table.update((rows) =>
      rows.map((bag) => {
        if (bag.id !== id) return bag;
        updated = { ...bag, rack, tab: "Racked", status: { label: "Ready", tone: "green" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Bag ${id} not found`);
    return updated;
  },
};
