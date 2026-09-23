import { CMS_CONFIGS } from "@/services/workspace/data/cms";
import type { ScheduledContent } from "@/types/scheduledContent";
import type { Badge } from "@/types/common";

/** Reuses the "cms-cal" rows already transcribed in workspace/data/cms.ts — "Next 14 days" is the
 * seed list, cross-referenced against "Conflicts" for the slot-clash flag (the design lists a
 * conflicted item in both tabs with different status labels). */
function buildSeed(): ScheduledContent[] {
  const config = CMS_CONFIGS["cms-cal"];
  const rows = config?.rows["Next 14 days"] ?? [];
  const conflictTitles = new Set((config?.rows["Conflicts"] ?? []).map((r) => r[0]));
  return rows.map((row, i) => {
    const [title, type, surface, placement, date, time, owner, status] = row;
    return {
      id: `sched-${i}`,
      title: title as string,
      type: type as string,
      surface: surface as string,
      placement: placement as string,
      date: date as string,
      time: time as string,
      owner: owner as string,
      status: status as Badge,
      hasConflict: conflictTitles.has(title),
    };
  });
}

export const SEED_SCHEDULED_CONTENT: ScheduledContent[] = buildSeed();
