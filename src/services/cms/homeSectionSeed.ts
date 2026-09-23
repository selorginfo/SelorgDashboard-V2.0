import { CMS_CONFIGS } from "@/services/workspace/data/cms";
import type { HomeSection } from "@/types/homeSection";
import type { Badge } from "@/types/common";

/** Reuses the "cms-home" rows already transcribed in workspace/data/cms.ts, reshaped for the
 * bespoke section-by-section builder instead of re-copying the same rows. */
function buildSeed(): HomeSection[] {
  const config = CMS_CONFIGS["cms-home"];
  if (!config) return [];
  const items: HomeSection[] = [];
  let counter = 0;
  for (const [surface, rows] of Object.entries(config.rows)) {
    for (const row of rows) {
      const [section, component, boundContent, , author, order, updated, status] = row;
      items.push({
        id: `section-${counter++}`,
        section: section as string,
        component: component as string,
        boundContent: boundContent as string,
        surface: surface as HomeSection["surface"],
        author: author as string,
        order: Number(order),
        updated: updated as string,
        status: status as Badge,
      });
    }
  }
  return items;
}

export const SEED_HOME_SECTIONS: HomeSection[] = buildSeed();
