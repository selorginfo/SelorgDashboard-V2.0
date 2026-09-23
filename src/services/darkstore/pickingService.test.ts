import { beforeEach, describe, expect, it } from "vitest";
import { mockPickingService } from "@/services/darkstore/pickingService.mock";

describe("mockPickingService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reassigns a picker on a queued order", async () => {
    const orders = await mockPickingService.list();
    const target = orders.find((o) => o.tab === "Picking queue")!;

    const updated = await mockPickingService.reassignPicker(target.id, "Anita S.");
    expect(updated.picker).toBe("Anita S.");
  });

  it("moves a pending order to assigned once it has a picker", async () => {
    const orders = await mockPickingService.list();
    const pending = orders.find((o) => o.status.label === "Pending")!;
    expect(pending).toBeDefined();

    const updated = await mockPickingService.reassignPicker(pending.id, "Suresh P.");
    expect(updated.status.label).toBe("Assigned");
    expect(updated.status.tone).toBe("blue");
  });

  it("throws for an unknown order id", async () => {
    await expect(mockPickingService.reassignPicker("SEL-000000", "Ravi M.")).rejects.toThrow();
  });
});
