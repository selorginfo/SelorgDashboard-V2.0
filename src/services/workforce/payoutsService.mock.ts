import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_PAYOUT_RUNS } from "@/services/workforce/payoutsSeed";
import type { PayoutRun } from "@/types/workforce";
import type { PayoutsService } from "@/services/workforce/payoutsService";

const table = createMockTable<PayoutRun>("selorg.workforce.payouts", SEED_PAYOUT_RUNS);

export const mockPayoutsService: PayoutsService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async approveRun(id) {
    await mockDelay(260);
    let updated: PayoutRun | undefined;
    table.update((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        updated = { ...r, status: { label: "Approved", tone: "blue" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Payout run ${id} not found`);
    return updated;
  },
};
