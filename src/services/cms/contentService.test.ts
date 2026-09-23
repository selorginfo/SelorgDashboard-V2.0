import { beforeEach, describe, expect, it } from "vitest";
import { mockContentService } from "@/services/cms/contentService.mock";

describe("mockContentService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("moves a content item to the next pipeline stage", async () => {
    const items = await mockContentService.list();
    const draft = items.find((c) => c.stage === "Draft")!;

    const updated = await mockContentService.setStage(draft.id, "In review");
    expect(updated.stage).toBe("In review");
  });
});
