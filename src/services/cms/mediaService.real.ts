import { api, getToken, removeToken } from "@/lib/apiClient";
import type { MediaAsset } from "@/types/mediaAsset";
import type { MediaService } from "./mediaService";

const API_BASE = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"] || "http://localhost:3333";

type RawMedia = Record<string, unknown>;

function normalize(raw: RawMedia, index: number): MediaAsset {
  const statusObj = raw["status"];
  let label = "Unused";
  let tone: "green" | "amber" | "grey" | "red" | "blue" = "grey";
  if (statusObj && typeof statusObj === "object") {
    label = String((statusObj as { label?: string }).label ?? "Unused");
    tone = ((statusObj as { tone?: string }).tone as typeof tone) || "grey";
  } else if (typeof statusObj === "string") {
    const s = statusObj.toLowerCase();
    if (s.includes("use")) {
      label = "In use";
      tone = "green";
    } else if (s.includes("archiv")) label = "Archived";
    else if (s.includes("await")) {
      label = "Awaiting approval";
      tone = "amber";
    }
  }
  const id = String(raw["id"] ?? raw["_id"] ?? `media-${index}`);
  return {
    id,
    filename: String(raw["filename"] ?? raw["name"] ?? "asset"),
    format: String(raw["format"] ?? "JPG"),
    dimensions: String(raw["dimensions"] ?? "—"),
    usedIn: String(raw["usedIn"] ?? "—"),
    uploadedBy: String(raw["uploadedBy"] ?? "Admin"),
    size: String(raw["size"] ?? "—"),
    sizeBytes: Number(raw["sizeBytes"] ?? 0),
    url: String(raw["url"] ?? ""),
    updated: String(raw["updated"] ?? "—"),
    status: { label, tone },
    categories: Array.isArray(raw["categories"]) ? (raw["categories"] as string[]) : [],
  };
}

function unwrapList(res: unknown): { items: RawMedia[]; totalBytes: number } {
  if (Array.isArray(res)) return { items: res as RawMedia[], totalBytes: 0 };
  const r = res as { list?: RawMedia[]; data?: RawMedia[]; meta?: { totalBytes?: number } };
  const items = r.list ?? r.data ?? [];
  return { items: Array.isArray(items) ? items : [], totalBytes: Number(r.meta?.totalBytes ?? 0) };
}

export const realMediaService: MediaService = {
  async list(): Promise<MediaAsset[]> {
    const res = await api.get<unknown>("/api/v1/customer/admin/cms/media");
    const { items } = unwrapList(res);
    return items.map((item, i) => normalize(item, i));
  },

  async listWithMeta(): Promise<{ assets: MediaAsset[]; totalBytes: number }> {
    const token = getToken();
    const res = await fetch(`${API_BASE}/api/v1/customer/admin/cms/media`, {
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      cache: "no-store",
    });
    if (!res.ok) {
      if (res.status === 401) {
        removeToken();
        throw new Error("Authentication required. Please login.");
      }
      throw new Error("Failed to load media");
    }
    const json = (await res.json().catch(() => ({}))) as {
      data?: RawMedia[];
      meta?: { totalBytes?: number };
    };
    const items = Array.isArray(json.data) ? json.data : [];
    return {
      assets: items.map((item, i) => normalize(item, i)),
      totalBytes: Number(json.meta?.totalBytes ?? 0),
    };
  },

  async archive(id: string): Promise<MediaAsset> {
    await api.delete(`/api/v1/customer/admin/cms/media/${id}`);
    return {
      id,
      filename: id,
      format: "JPG",
      dimensions: "—",
      usedIn: "—",
      uploadedBy: "Admin",
      size: "—",
      updated: "—",
      status: { label: "Archived", tone: "grey" },
      categories: ["Archived"],
    };
  },

  async upload(file: File, categories?: string[]): Promise<MediaAsset> {
    const token = getToken();
    const form = new FormData();
    form.append("file", file);
    if (categories?.length) form.append("categories", categories.join(","));
    const res = await fetch(`${API_BASE}/api/v1/customer/admin/cms/media`, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
      body: form,
      cache: "no-store",
    });
    const json = (await res.json().catch(() => ({}))) as {
      success?: boolean;
      message?: string;
      data?: RawMedia;
    };
    if (!res.ok) {
      throw new Error(json.message || `Upload failed (${res.status})`);
    }
    return normalize((json.data ?? {}) as RawMedia, 0);
  },
};
