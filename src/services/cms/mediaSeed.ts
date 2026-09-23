import { CMS_CONFIGS } from "@/services/workspace/data/cms";
import type { MediaAsset } from "@/types/mediaAsset";
import type { Badge } from "@/types/common";

/** Reuses the "cms-media" rows already transcribed in workspace/data/cms.ts — "All assets" is the
 * seed list, and each file's membership in the other tabs (Banners, Product & recipe, App help,
 * Unused, Archived) becomes its filter categories, so nothing is re-transcribed a second time. */
function buildSeed(): MediaAsset[] {
  const config = CMS_CONFIGS["cms-media"];
  if (!config) return [];
  const allAssets = config.rows["All assets"] ?? [];
  const otherTabs = Object.keys(config.rows).filter((t) => t !== "All assets");

  return allAssets.map((row, i) => {
    const [filename, format, dimensions, usedIn, uploadedBy, size, updated, status] = row;
    const categories = otherTabs.filter((tab) =>
      (config.rows[tab] ?? []).some((r) => r[0] === filename)
    );
    return {
      id: `asset-${i}`,
      filename: filename as string,
      format: format as string,
      dimensions: dimensions as string,
      usedIn: usedIn as string,
      uploadedBy: uploadedBy as string,
      size: size as string,
      updated: updated as string,
      status: status as Badge,
      categories,
    };
  });
}

export const SEED_MEDIA_ASSETS: MediaAsset[] = buildSeed();
