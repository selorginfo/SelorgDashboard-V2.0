import { api } from "@/lib/apiClient";
import type { Category, CategoryFormInput } from "@/types/category";
import type { CategoryService } from "./categoryService";

type RawCategory = {
  _id?: string;
  id?: string;
  name: string;
  parentId?: string | null;
  isActive?: boolean;
  order?: number;
  sortOrder?: number;
  products?: number;
  updatedAt?: string;
  updated?: string;
  status?: Category["status"];
  imageUrl?: string;
  thumbnailUrl?: string;
  cardImageUrl?: string;
};

function normalize(raw: RawCategory, index = 0): Category {
  const isActive = raw.isActive ?? true;
  const id = String(raw._id ?? raw.id ?? "").trim();
  return {
    id: id || `cat-${index}-${String(raw.name || "unnamed").replace(/\s+/g, "-").toLowerCase()}`,
    name: raw.name,
    parentId: raw.parentId && raw.parentId !== "null" ? raw.parentId : null,
    products: raw.products ?? 0,
    sortOrder: raw.sortOrder ?? raw.order ?? 0,
    updated: raw.updated ?? raw.updatedAt ?? "",
    status: raw.status ?? {
      label: isActive ? "Active" : "Disabled",
      tone: isActive ? "green" : "grey",
    },
    imageUrl: raw.imageUrl || raw.cardImageUrl || raw.thumbnailUrl || "",
    thumbnailUrl: raw.thumbnailUrl || raw.imageUrl || raw.cardImageUrl || "",
  };
}

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const realCategoryService: CategoryService = {
  async list(): Promise<Category[]> {
    const res = await api.get<{ list?: RawCategory[] } | RawCategory[]>("/api/v1/customer/admin/categories/all");
    const raw = Array.isArray(res) ? res : (res as { list?: RawCategory[] }).list ?? [];
    return raw.map((row, i) => normalize(row, i));
  },

  async setStatus(id: string, status: Category["status"]): Promise<Category> {
    const isActive = status.tone !== "grey";
    const raw = await api.put<RawCategory>(`/api/v1/customer/admin/categories/${id}`, { isActive });
    return normalize(raw);
  },

  async create(input: CategoryFormInput): Promise<Category> {
    const raw = await api.post<RawCategory>("/api/v1/customer/admin/categories", {
      ...input,
      slug: toSlug(input.name),
      order: input.sortOrder,
    });
    return normalize(raw);
  },

  async update(id: string, input: Partial<CategoryFormInput>): Promise<Category> {
    const raw = await api.put<RawCategory>(`/api/v1/customer/admin/categories/${id}`, {
      ...input,
      ...(input.name ? { slug: toSlug(input.name) } : {}),
      ...(input.sortOrder !== undefined ? { order: input.sortOrder } : {}),
    });
    return normalize(raw);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/customer/admin/categories/${id}`);
  },
};
