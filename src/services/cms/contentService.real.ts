import { api } from "@/lib/apiClient";
import type { ContentItem, ContentStage } from "@/types/contentItem";
import type { ContentService, CreateContentInput } from "./contentService";

function mapContent(raw: Record<string, unknown>, index = 0): ContentItem {
  const status = String(raw["status"] ?? "").toLowerCase();
  const stageRaw = String(raw["stage"] ?? "").trim();
  const stageMap: Record<string, ContentStage> = {
    draft: "Draft",
    review: "In review",
    "in review": "In review",
    "in_review": "In review",
    approved: "Approved",
    scheduled: "Scheduled",
    published: "Published",
    archived: "Archived",
  };
  const id = String(raw["id"] ?? raw["_id"] ?? "").trim();
  const stageFromField = (["Draft", "In review", "Approved", "Scheduled", "Published", "Archived"] as ContentStage[]).includes(
    stageRaw as ContentStage
  )
    ? (stageRaw as ContentStage)
    : stageMap[stageRaw.toLowerCase()];
  const stageFromStatus = stageMap[status];
  return {
    id: id || `content-${index}-${String(raw["slug"] ?? raw["title"] ?? "item").slice(0, 24)}`,
    title: String(raw["title"] ?? "Untitled"),
    type: String(raw["type"] ?? raw["pageType"] ?? "Page"),
    placement: String(raw["placement"] ?? raw["slug"] ?? "—"),
    surface: (String(raw["surface"] ?? "Customer app") as ContentItem["surface"]),
    author: String(raw["author"] ?? "Admin"),
    schedule: String(raw["schedule"] ?? "—"),
    updated: raw["updatedAt"]
      ? new Date(String(raw["updatedAt"])).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : "—",
    stage: stageFromField ?? stageFromStatus ?? "Draft",
  };
}

function mapBanner(raw: Record<string, unknown>, index = 0): ContentItem {
  const isActive = raw["isActive"] !== false;
  const slot = String(raw["slot"] ?? "hero");
  const redirectType = String(raw["redirectType"] ?? "");
  const redirectValue = String(raw["redirectValue"] ?? "");
  const placement =
    slot === "hero"
      ? `Home · hero`
      : slot === "mid"
        ? `Home · mid`
        : `Home · ${slot}`;
  const schedule = isActive ? "Live" : "Inactive";
  return {
    id: String(raw["_id"] ?? raw["id"] ?? `banner-${index}`),
    title: String(raw["title"] ?? "Untitled banner"),
    type: slot === "hero" ? "Hero banner" : "Strip banner",
    placement,
    surface: "Customer app",
    author: String(raw["createdBy"] ?? "Admin"),
    schedule: redirectType && redirectValue ? `${schedule} → ${redirectType}:${redirectValue}` : schedule,
    updated: raw["updatedAt"]
      ? new Date(String(raw["updatedAt"])).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : "—",
    stage: isActive ? "Published" : "Archived",
  };
}

function unwrapList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const r = res as { list?: Record<string, unknown>[]; pages?: Record<string, unknown>[]; data?: Record<string, unknown>[] };
  return r.list ?? r.pages ?? (Array.isArray(r.data) ? r.data : []);
}

export const realContentService: ContentService = {
  async list(): Promise<ContentItem[]> {
    // Pages + banners from the real backend — never seed/mock fixtures.
    const [pagesRes, bannersRes] = await Promise.allSettled([
      api.get<unknown>("/api/v1/customer/admin/cms/pages"),
      api.get<unknown>("/api/v1/customer/admin/banners"),
    ]);
    const pages =
      pagesRes.status === "fulfilled" ? unwrapList(pagesRes.value).map((row, i) => mapContent(row, i)) : [];
    const banners =
      bannersRes.status === "fulfilled" ? unwrapList(bannersRes.value).map((row, i) => mapBanner(row, i)) : [];
    return [...banners, ...pages];
  },

  async setStage(id: string, stage: ContentStage): Promise<ContentItem> {
    // Banner ids are Mongo ObjectIds from /banners; page stage updates go to CMS pages.
    // Prefer page update; if 404, treat as banner activate/deactivate.
    try {
      const status = stage === "Published" ? "published" : stage === "Archived" ? "archived" : "draft";
      const res = await api.put<unknown>(`/api/v1/customer/admin/cms/pages/${id}`, {
        stage,
        status,
      });
      const root = res as Record<string, unknown>;
      const mapped = mapContent((root["data"] ?? root) as Record<string, unknown>);
      return { ...mapped, stage: mapped.stage || stage };
    } catch {
      const isActive = stage === "Published" || stage === "Scheduled" || stage === "Approved";
      const res = await api.put<unknown>(`/api/v1/customer/admin/banners/${id}`, { isActive });
      const root = res as Record<string, unknown>;
      return mapBanner((root["data"] ?? root) as Record<string, unknown>);
    }
  },

  async create(input: CreateContentInput): Promise<ContentItem> {
    const isBanner = /banner/i.test(input.type || "");
    if (isBanner) {
      const res = await api.post<unknown>("/api/v1/customer/admin/banners", {
        title: input.title,
        slot: "hero",
        isActive: false,
        redirectType: "none",
        redirectValue: "",
        imageUrl: "",
      });
      const root = res as Record<string, unknown>;
      return mapBanner((root["data"] ?? root) as Record<string, unknown>);
    }
    const slug = `${input.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)}-${Date.now().toString(36)}`;
    const res = await api.post<unknown>("/api/v1/customer/admin/cms/pages", {
      title: input.title,
      slug,
      status: "draft",
      stage: "Draft",
      surface: input.surface,
      type: input.type || "Page",
      blocks: [],
    });
    const root = res as Record<string, unknown>;
    const mapped = mapContent((root["data"] ?? root) as Record<string, unknown>);
    return {
      ...mapped,
      surface: mapped.surface || input.surface,
      type: mapped.type !== "Page" || !input.type ? mapped.type : input.type,
      title: mapped.title || input.title,
      stage: mapped.stage || "Draft",
    };
  },
};
