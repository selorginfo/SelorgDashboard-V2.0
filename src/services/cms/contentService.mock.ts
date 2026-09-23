import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_CONTENT_ITEMS } from "@/services/cms/seed";
import type { ContentItem } from "@/types/contentItem";
import type { ContentService, CreateContentInput } from "@/services/cms/contentService";

const table = createMockTable<ContentItem>("selorg.cms.content", SEED_CONTENT_ITEMS);

export const mockContentService: ContentService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async setStage(id, stage) {
    await mockDelay(220);
    let updated: ContentItem | undefined;
    table.update((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, stage };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Content item ${id} not found`);
    return updated;
  },

  async create(input: CreateContentInput): Promise<ContentItem> {
    await mockDelay(250);
    const item: ContentItem = {
      id: `cnt-${Date.now()}`,
      title: input.title,
      type: input.type || "Page",
      placement: "—",
      surface: input.surface,
      author: "Admin",
      schedule: "—",
      updated: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      stage: "Draft",
    };
    table.update((rows) => [...rows, item]);
    return item;
  },
};
