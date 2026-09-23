import { beforeEach, describe, expect, it } from "vitest";
import { mockPayoutsService } from "@/services/workforce/payoutsService.mock";

describe("mockPayoutsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("approves a current run row awaiting approval", async () => {
    const runs = await mockPayoutsService.list();
    const target = runs.find((r) => r.tab === "Current run" && r.status.label === "Awaiting approval")!;
    expect(target).toBeDefined();

    const updated = await mockPayoutsService.approveRun(target.id);
    expect(updated.status.label).toBe("Approved");
  });

  it("throws for an unknown run id", async () => {
    await expect(mockPayoutsService.approveRun("current-run-unknown")).rejects.toThrow();
  });
});
