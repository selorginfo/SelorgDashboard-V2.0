import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_GRNS } from "@/services/warehouse/grnSeed";
import type { Grn } from "@/types/warehouse";
import type { GrnService } from "@/services/warehouse/grnService";

const table = createMockTable<Grn>("selorg.warehouse.grns", SEED_GRNS);

function setStatus(id: string, status: Grn["status"]): Grn {
  let updated: Grn | undefined;
  table.update((rows) =>
    rows.map((g) => {
      if (g.id !== id) return g;
      updated = { ...g, status };
      return updated;
    })
  );
  if (!updated) throw new MockApiError(`GRN ${id} not found`);
  return updated;
}

export const mockGrnService: GrnService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async startReceiving(id) {
    await mockDelay(220);
    return setStatus(id, { label: "Receiving", tone: "blue" });
  },

  async verifyQuantity(id) {
    await mockDelay(220);
    return setStatus(id, { label: "Qty verified", tone: "blue" });
  },

  async sendToQc(id) {
    await mockDelay(220);
    return setStatus(id, { label: "QC", tone: "amber" });
  },

  async accept(id) {
    await mockDelay(220);
    return setStatus(id, { label: "Accepted", tone: "green" });
  },

  async reject(id) {
    await mockDelay(220);
    return setStatus(id, { label: "Rejected", tone: "red" });
  },

  async raiseDebitNote(id) {
    await mockDelay(220);
    return setStatus(id, { label: "Debit note", tone: "amber" });
  },

  async generateGrn(id) {
    await mockDelay(220);
    return setStatus(id, { label: "Closed", tone: "green" });
  },
};
