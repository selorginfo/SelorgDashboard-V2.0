import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_EARNING_RULES } from "@/services/earningRules/seed";
import type { EarningRule } from "@/types/earningRule";
import type { EarningRuleAction, EarningRuleService } from "@/services/earningRules/earningRuleService";

const table = createMockTable<EarningRule>("selorg.earning-rules", SEED_EARNING_RULES);

const STATUS_FOR_ACTION: Record<EarningRuleAction, EarningRule["status"]> = {
  "Submit for approval": { label: "Pending approval", tone: "amber" },
  "Approve rule": { label: "Active", tone: "green" },
  "Schedule rule": { label: "Scheduled", tone: "blue" },
  "Resolve conflict": { label: "Active", tone: "green" },
  "Expire rule": { label: "Expired", tone: "grey" },
};

export const mockEarningRuleService: EarningRuleService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async applyAction(id, action) {
    await mockDelay(280);
    let updated: EarningRule | undefined;
    table.update((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        updated = {
          ...r,
          status: STATUS_FOR_ACTION[action],
          conflictWith: action === "Resolve conflict" ? undefined : r.conflictWith,
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Rule ${id} not found`);
    return updated;
  },
};
