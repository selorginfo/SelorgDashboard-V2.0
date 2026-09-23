import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_HOME_SECTIONS } from "@/services/cms/homeSectionSeed";
import type { HomeSection } from "@/types/homeSection";
import type { HomeSectionService, CreateHomeSectionInput } from "@/services/cms/homeSectionService";

const table = createMockTable<HomeSection>("selorg.cms.home-sections", SEED_HOME_SECTIONS, 2);

export const mockHomeSectionService: HomeSectionService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async setEnabled(id, enabled) {
    await mockDelay(200);
    let updated: HomeSection | undefined;
    table.update((rows) =>
      rows.map((s) => {
        if (s.id !== id) return s;
        updated = {
          ...s,
          status: enabled ? { label: "Enabled", tone: "green" } : { label: "Disabled", tone: "grey" },
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Section ${id} not found`);
    return updated;
  },

  async move(id, direction) {
    await mockDelay(220);
    const all = table.all();
    const target = all.find((s) => s.id === id);
    if (!target) throw new MockApiError(`Section ${id} not found`);
    const siblings = all.filter((s) => s.surface === target.surface).sort((a, b) => a.order - b.order);
    const idx = siblings.findIndex((s) => s.id === id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= siblings.length) return all;
    const neighbor = siblings[swapIdx]!;
    const targetOrder = target.order;
    table.update((rows) =>
      rows.map((s) => {
        if (s.id === target.id) return { ...s, order: neighbor.order };
        if (s.id === neighbor.id) return { ...s, order: targetOrder };
        return s;
      })
    );
    return table.all();
  },

  async create(input: CreateHomeSectionInput): Promise<HomeSection> {
    await mockDelay(250);
    const maxOrder = Math.max(
      0,
      ...table.all().filter((s) => s.surface === input.surface).map((s) => s.order)
    );
    const section: HomeSection = {
      id: `hs-${Date.now()}`,
      section: input.section || input.component,
      component: input.component,
      boundContent: "—",
      surface: input.surface,
      author: "Admin",
      order: input.order ?? maxOrder + 1,
      updated: new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
      status: { label: "Disabled", tone: "grey" },
    };
    table.update((rows) => [...rows, section]);
    return section;
  },

  async bindContent(id, productIds) {
    await mockDelay(200);
    let updated: HomeSection | undefined;
    table.update((rows) =>
      rows.map((s) => {
        if (s.id !== id) return s;
        updated = { ...s, boundContent: `${productIds.length} product(s)` };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Section ${id} not found`);
    return updated;
  },

  async preview() {
    await mockDelay(150);
    return { sections: table.all() };
  },

  async publish(id) {
    return this.setEnabled(id, true);
  },
};
