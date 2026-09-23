import { beforeEach, describe, expect, it } from "vitest";
import { mockShiftsService } from "@/services/workforce/shiftsService.mock";

describe("mockShiftsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("activates a draft shift template", async () => {
    const templates = await mockShiftsService.list();
    const draft = templates.find((t) => t.status.label === "Draft")!;
    expect(draft).toBeDefined();

    const updated = await mockShiftsService.activate(draft.id);
    expect(updated.status.label).toBe("Active");
  });

  it("throws for an unknown template id", async () => {
    await expect(mockShiftsService.activate("no-such-template")).rejects.toThrow();
  });
});
