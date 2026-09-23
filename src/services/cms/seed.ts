import { CMS_CONFIGS } from "@/services/workspace/data/cms";
import type { ContentItem, ContentStage, ContentSurface } from "@/types/contentItem";
import type { Badge } from "@/types/common";

const STATUS_TO_STAGE: Record<string, ContentStage> = {
  Draft: "Draft",
  "In review": "In review",
  Approved: "Approved",
  Scheduled: "Scheduled",
  Published: "Published",
  Archived: "Archived",
};

/** Flattens the generic `cms` Workspace rows (dc.html's real content pipeline data, already
 * transcribed once in workspace/data/cms.ts) into per-item records with a derived kanban stage —
 * avoids re-transcribing the same 58 rows a second time for the bespoke pipeline view. */
function buildSeed(): ContentItem[] {
  const config = CMS_CONFIGS.cms;
  if (!config) return [];
  const items: ContentItem[] = [];
  let counter = 0;
  for (const [surface, rows] of Object.entries(config.rows)) {
    for (const row of rows) {
      const [title, type, placement, , author, schedule, updated, statusCell] = row;
      const status = statusCell as Badge;
      items.push({
        id: `content-${counter++}`,
        title: title as string,
        type: type as string,
        placement: placement as string,
        surface: surface as ContentSurface,
        author: author as string,
        schedule: schedule as string,
        updated: updated as string,
        stage: STATUS_TO_STAGE[status.label] ?? "Draft",
      });
    }
  }
  return items;
}

export const SEED_CONTENT_ITEMS: ContentItem[] = buildSeed();
