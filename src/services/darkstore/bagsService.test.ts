import { beforeEach, describe, expect, it } from "vitest";
import { mockBagsService } from "@/services/darkstore/bagsService.mock";

describe("mockBagsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("marks an awaiting-rack bag as racked", async () => {
    const bags = await mockBagsService.list();
    const target = bags.find((b) => b.tab === "Awaiting rack")!;
    expect(target).toBeDefined();

    const updated = await mockBagsService.markRacked(target.id, "DS01-R05");
    expect(updated.tab).toBe("Racked");
    expect(updated.rack).toBe("DS01-R05");
    expect(updated.status.label).toBe("Ready");
  });

  it("throws for an unknown bag id", async () => {
    await expect(mockBagsService.markRacked("BAG-000000", "DS01-R05")).rejects.toThrow();
  });
});
