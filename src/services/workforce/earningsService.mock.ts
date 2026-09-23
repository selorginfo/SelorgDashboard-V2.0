import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_RIDER_EARNINGS, SEED_PICKER_EARNINGS } from "@/services/workforce/earningsSeed";
import type { WorkforceEarning, WorkerKind } from "@/types/workforce";
import type { EarningsService } from "@/services/workforce/earningsService";

const riderTable = createMockTable<WorkforceEarning>("selorg.workforce.earnings.rider", SEED_RIDER_EARNINGS);
const pickerTable = createMockTable<WorkforceEarning>("selorg.workforce.earnings.picker", SEED_PICKER_EARNINGS);

function tableFor(kind: WorkerKind) {
  return kind === "rider" ? riderTable : pickerTable;
}

export const mockEarningsService: EarningsService = {
  async list(kind) {
    await mockDelay();
    return tableFor(kind).all();
  },

  async approve(kind, id) {
    await mockDelay(220);
    let updated: WorkforceEarning | undefined;
    tableFor(kind).update((rows) =>
      rows.map((e) => {
        if (e.id !== id) return e;
        updated = { ...e, status: { label: "Approved", tone: "blue" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Earning ${id} not found`);
    return updated;
  },
};
