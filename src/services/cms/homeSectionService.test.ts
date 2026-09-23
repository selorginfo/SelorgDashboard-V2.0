import { beforeEach, describe, expect, it } from "vitest";
import { mockHomeSectionService } from "@/services/cms/homeSectionService.mock";

describe("mockHomeSectionService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("swaps order with the previous sibling when moved up", async () => {
    const sections = await mockHomeSectionService.list();
    const surfaceSections = sections.filter((s) => s.surface === sections[0]!.surface).sort((a, b) => a.order - b.order);
    const second = surfaceSections[1]!;
    const first = surfaceSections[0]!;

    const updated = await mockHomeSectionService.move(second.id, "up");
    const newFirst = updated.find((s) => s.id === second.id)!;
    const newSecond = updated.find((s) => s.id === first.id)!;
    expect(newFirst.order).toBe(first.order);
    expect(newSecond.order).toBe(second.order);
  });

  it("disables a section", async () => {
    const sections = await mockHomeSectionService.list();
    const target = sections[0]!;

    const updated = await mockHomeSectionService.setEnabled(target.id, false);
    expect(updated.status.label).toBe("Disabled");
  });
});
