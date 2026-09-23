import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_CATEGORIES } from "@/services/categories/seed";
import type { Category, CategoryFormInput } from "@/types/category";
import type { CategoryService } from "@/services/categories/categoryService";

const table = createMockTable<Category>("selorg.categories", SEED_CATEGORIES);

export const mockCategoryService: CategoryService = {
  async list() {
    await mockDelay();
    return table.all();
  },
  async setStatus(id, status) {
    await mockDelay(220);
    let updated: Category | undefined;
    table.update((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, status };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Category ${id} not found`);
    return updated;
  },
  async create(input: CategoryFormInput): Promise<Category> {
    await mockDelay(300);
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: input.name,
      parentId: input.parentId ?? null,
      products: 0,
      sortOrder: input.sortOrder ?? 99,
      updated: new Date().toISOString(),
      status: { label: "Active", tone: "green" },
    };
    table.update((rows) => [...rows, newCat]);
    return newCat;
  },
  async update(id: string, input: Partial<CategoryFormInput>): Promise<Category> {
    await mockDelay(250);
    let updated: Category | undefined;
    table.update((rows) =>
      rows.map((c) => {
        if (c.id !== id) return c;
        updated = { ...c, name: input.name ?? c.name, sortOrder: input.sortOrder ?? c.sortOrder };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Category ${id} not found`);
    return updated;
  },
  async remove(id: string): Promise<void> {
    await mockDelay(200);
    table.update((rows) => rows.filter((c) => c.id !== id));
  },
};
