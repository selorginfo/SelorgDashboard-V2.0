import { beforeEach, describe, expect, it } from "vitest";
import { mockRosterService } from "@/services/workforce/rosterService.mock";

describe("mockRosterService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("approves an awaiting swap request", async () => {
    const entries = await mockRosterService.list();
    const target = entries.find((r) => r.tab === "Swap requests" && r.status.label === "Awaiting approval")!;
    expect(target).toBeDefined();

    const updated = await mockRosterService.approveSwap(target.id);
    expect(updated.status.label).toBe("Approved");
  });

  it("throws for an unknown swap request id", async () => {
    await expect(mockRosterService.approveSwap("swap-unknown")).rejects.toThrow();
  });
});
