import { beforeEach, describe, expect, it } from "vitest";
import { mockPutawayService } from "@/services/warehouse/putawayService.mock";

describe("mockPutawayService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("confirms a queued task with the assigned location and flips it to Confirmed", async () => {
    const tasks = await mockPutawayService.list();
    const target = tasks.find((t) => t.status.label !== "Confirmed")!;

    const updated = await mockPutawayService.confirm(target.id, "B · R11 · B02");
    expect(updated.status.label).toBe("Confirmed");
    expect(updated.assigned).toBe("B · R11 · B02");

    const all = await mockPutawayService.list();
    expect(all.find((t) => t.id === target.id)?.assigned).toBe("B · R11 · B02");
  });

  it("throws for an unknown task id", async () => {
    await expect(mockPutawayService.confirm("PUT-0000", "A · R01 · B01")).rejects.toThrow();
  });
});
