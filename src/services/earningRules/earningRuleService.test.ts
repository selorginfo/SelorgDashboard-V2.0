import { beforeEach, describe, expect, it } from "vitest";
import { mockEarningRuleService } from "@/services/earningRules/earningRuleService.mock";
import { parseRuleAmount } from "@/modules/earningRules/calculatePreview";

describe("mockEarningRuleService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("moves a rule to Active on approval", async () => {
    const rules = await mockEarningRuleService.list();
    const pending = rules[0]!;

    const updated = await mockEarningRuleService.applyAction(pending.id, "Approve rule");
    expect(updated.status.label).toBe("Active");
  });

  it("clears the conflict flag when resolved", async () => {
    const rules = await mockEarningRuleService.list();
    const conflicted = rules.find((r) => r.conflictWith)!;

    const updated = await mockEarningRuleService.applyAction(conflicted.id, "Resolve conflict");
    expect(updated.conflictWith).toBeUndefined();
  });
});

describe("parseRuleAmount", () => {
  it("computes a per-unit rate for distance-based rules", async () => {
    const rules = await mockEarningRuleService.list();
    const distanceRule = rules.find((r) => r.id === "RUL-102")!;

    const preview = parseRuleAmount(distanceRule);
    expect(preview.isPerUnit).toBe(true);
    expect(preview.compute(4.5)).toBe(27);
  });

  it("returns the flat amount unchanged for fixed rules", async () => {
    const rules = await mockEarningRuleService.list();
    const baseRule = rules.find((r) => r.id === "RUL-101")!;

    const preview = parseRuleAmount(baseRule);
    expect(preview.isPerUnit).toBe(false);
    expect(preview.compute(10)).toBe(32);
  });
});
