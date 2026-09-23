import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import type { ShiftTemplate } from "@/types/workforce";
import type { Badge } from "@/types/common";

const CONFIG = WORKFORCE_CONFIGS.shifts;

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** "All templates" is the superset in the source config — the other three tabs (Picker shifts,
 * Rider shifts, Draft & retired) are pure filters over the same 7 rows (a shift can legitimately
 * appear under more than one, e.g. "Weekend Surge" is both a Rider shift and Draft), so the
 * canonical list is built once from "All templates" and tab membership is computed in the
 * component from `appliesTo`/`status` rather than re-iterating each filtered bucket. */
function buildShiftTemplates(): ShiftTemplate[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows["All templates"] ?? [];
  return rows.map((row) => {
    const [name, appliesTo, hours, days, breakTime, headcount, scope, status] = row;
    return {
      id: slug(name as string),
      name: name as string,
      appliesTo: appliesTo as "Picker" | "Rider",
      hours: hours as string,
      days: days as string,
      breakTime: breakTime as string,
      headcountTarget: headcount as string,
      scope: scope as string,
      status: status as Badge,
    };
  });
}

export const SEED_SHIFT_TEMPLATES: ShiftTemplate[] = buildShiftTemplates();
