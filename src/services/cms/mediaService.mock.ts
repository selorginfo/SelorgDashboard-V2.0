import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_MEDIA_ASSETS } from "@/services/cms/mediaSeed";
import type { MediaAsset } from "@/types/mediaAsset";
import type { MediaService } from "@/services/cms/mediaService";

const table = createMockTable<MediaAsset>("selorg.cms.media", SEED_MEDIA_ASSETS);

export const mockMediaService: MediaService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async listWithMeta() {
    await mockDelay();
    const assets = table.all();
    return { assets, totalBytes: assets.length * 120_000 };
  },

  async archive(id) {
    await mockDelay(220);
    let updated: MediaAsset | undefined;
    table.update((rows) =>
      rows.map((a) => {
        if (a.id !== id) return a;
        updated = { ...a, status: { label: "Archived", tone: "grey" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Asset ${id} not found`);
    return updated;
  },

  async upload(file, categories) {
    await mockDelay(400);
    const asset: MediaAsset = {
      id: `up-${Date.now()}`,
      filename: file.name,
      format: file.type.includes("png") ? "PNG" : "JPG",
      dimensions: "—",
      usedIn: "—",
      uploadedBy: "Admin",
      size: `${Math.round(file.size / 1024)} KB`,
      sizeBytes: file.size,
      url: "",
      updated: "Today",
      status: { label: "Unused", tone: "grey" },
      categories: categories?.length ? categories : ["Unused"],
    };
    table.update((rows) => [asset, ...rows]);
    return asset;
  },
};
