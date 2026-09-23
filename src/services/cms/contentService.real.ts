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

export const realContentService: ContentService = {
  async list(): Promise<ContentItem[]> {
    const res = await api.get<unknown>("/api/v1/customer/admin/cms/pages");
    if (Array.isArray(res)) return (res as Record<string, unknown>[]).map((row, i) => mapContent(row, i));
    const r = res as { list?: Record<string, unknown>[]; pages?: Record<string, unknown>[]; data?: Record<string, unknown>[] };
    const list = r.list ?? r.pages ?? (Array.isArray(r.data) ? r.data : []);
    return list.map((row, i) => mapContent(row, i));
  },

  async setStage(id: string, stage: ContentStage): Promise<ContentItem> {
    const status = stage === "Published" ? "published" : "draft";
    const res = await api.put<unknown>(`/api/v1/customer/admin/cms/pages/${id}`, {
      stage,
      status,
    });
    const root = res as Record<string, unknown>;
    const mapped = mapContent((root["data"] ?? root) as Record<string, unknown>);
    return { ...mapped, stage: mapped.stage || stage };
  },

  async create(input: CreateContentInput): Promise<ContentItem> {
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
