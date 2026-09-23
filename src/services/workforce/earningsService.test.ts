import { beforeEach, describe, expect, it } from "vitest";
import { mockEarningsService } from "@/services/workforce/earningsService.mock";

describe("mockEarningsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("approves a pending rider earning", async () => {
    const earnings = await mockEarningsService.list("rider");
    const pending = earnings.find((e) => e.tab === "Pending approval")!;
    expect(pending).toBeDefined();

    const updated = await mockEarningsService.approve("rider", pending.id);
    expect(updated.status.label).toBe("Approved");
  });

  it("approves a pending picker earning", async () => {
    const earnings = await mockEarningsService.list("picker");
    const pending = earnings.find((e) => e.tab === "Pending approval")!;
    expect(pending).toBeDefined();

    const updated = await mockEarningsService.approve("picker", pending.id);
    expect(updated.status.label).toBe("Approved");
  });

  it("throws for an unknown earning id", async () => {
    await expect(mockEarningsService.approve("rider", "rider-unknown")).rejects.toThrow();
  });
});
