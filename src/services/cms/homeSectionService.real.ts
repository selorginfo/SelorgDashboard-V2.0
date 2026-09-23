import { api } from "@/lib/apiClient";
import type { HomeSection } from "@/types/homeSection";
import type { HomeSectionService, CreateHomeSectionInput } from "./homeSectionService";

function sectionKeyFrom(component: string): string {
  return (
    component
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 48) || `section_${Date.now()}`
  );
}

function mapSection(raw: Record<string, unknown>, index = 0): HomeSection {
  const active = raw["isActive"] !== false && String(raw["status"] ?? "").toLowerCase() !== "disabled";
  const id = String(raw["id"] ?? raw["_id"] ?? "").trim();
  return {
    id: id || `section-${index}-${String(raw["sectionKey"] ?? raw["title"] ?? "x")}`,
    section: String(raw["title"] ?? raw["section"] ?? raw["sectionKey"] ?? "Section"),
    component: String(raw["sectionType"] ?? raw["component"] ?? "—"),
    boundContent: String(raw["boundContent"] ?? raw["viewAllLink"] ?? "—"),
    surface: String(raw["surface"] ?? "Customer app home") as HomeSection["surface"],
    author: String(raw["author"] ?? "Admin"),
    order: Number(raw["order"] ?? index),
    updated: raw["updatedAt"]
      ? new Date(String(raw["updatedAt"])).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : "—",
    status: active ? { label: "Enabled", tone: "green" } : { label: "Disabled", tone: "grey" },
  };
}

function unwrapList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const r = res as { list?: Record<string, unknown>[]; data?: Record<string, unknown>[]; sections?: Record<string, unknown>[] };
  return r.list ?? r.sections ?? r.data ?? [];
}

export const realHomeSectionService: HomeSectionService = {
  async list(): Promise<HomeSection[]> {
    const res = await api.get<unknown>("/api/v1/customer/admin/home/sections");
    return unwrapList(res).map((row, i) => mapSection(row, i));
  },

  async setEnabled(id: string, enabled: boolean): Promise<HomeSection> {
    const res = await api.put<unknown>(`/api/v1/customer/admin/home/sections/${id}`, {
      isActive: enabled,
      enabled,
    });
    const root = res as Record<string, unknown>;
    return mapSection((root["data"] ?? root) as Record<string, unknown>);
  },

  async move(id: string, direction: "up" | "down"): Promise<HomeSection[]> {
    const current = await this.list();
    const ordered = [...current].sort((a, b) => a.order - b.order);
    const idx = ordered.findIndex((s) => s.id === id);
    if (idx < 0) return ordered;
    const swapWith = direction === "up" ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= ordered.length) return ordered;
    const next = [...ordered];
    const a = next[idx]!;
    const b = next[swapWith]!;
    next[idx] = b;
    next[swapWith] = a;
    await api.post<unknown>("/api/v1/customer/admin/home/sections/reorder", {
      ids: next.map((s) => s.id),
    });
    return this.list();
  },

  async bindContent(id: string, productIds: string[]): Promise<HomeSection> {
    const res = await api.patch<unknown>(`/api/v1/customer/admin/home/sections/${id}/products`, { productIds });
    const root = res as Record<string, unknown>;
    return mapSection((root["data"] ?? root) as Record<string, unknown>);
  },

  async preview(): Promise<unknown> {
    return api.get("/api/v1/customer/admin/home/preview");
  },

  async publish(id: string): Promise<HomeSection> {
    return this.setEnabled(id, true);
  },

  async create(input: CreateHomeSectionInput): Promise<HomeSection> {
    const key = `${sectionKeyFrom(input.component)}_${Date.now().toString(36)}`;
    const res = await api.post<unknown>("/api/v1/customer/admin/home/sections", {
      sectionKey: key,
      title: input.section || input.component,
      sectionType: input.component,
      order: input.order ?? 0,
      isActive: false,
      surface: input.surface,
      maxItems: 10,
    });
    const root = res as Record<string, unknown>;
    return mapSection((root["data"] ?? root) as Record<string, unknown>);
  },
};
