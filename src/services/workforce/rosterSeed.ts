import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import type { RosterEntry } from "@/types/workforce";
import type { Badge } from "@/types/common";

const CONFIG = WORKFORCE_CONFIGS.roster;

/** Today, Tomorrow, Swap requests and This week are independent datasets in the source config.
 * "Unfilled" is deliberately NOT built here — cross-checking the source rows shows it's exactly
 * the understaffed subset of Today + Tomorrow (same shift/location/values repeated verbatim), so
 * it's computed as a view over those two tabs in the roster hook/page instead of being
 * re-transcribed as a fifth bucket. */
const BUCKET_TABS = ["Today", "Tomorrow", "Swap requests", "This week"];

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function buildRosterEntries(): RosterEntry[] {
  if (!CONFIG) return [];
  const out: RosterEntry[] = [];
  for (const tab of BUCKET_TABS) {
    for (const row of CONFIG.rows[tab] ?? []) {
      const [shift, location, assigned, target, confirmed, gap, starts, status] = row;
      out.push({
        id: `${slug(tab)}-${slug(shift as string)}-${slug(location as string)}`,
        shift: shift as string,
        location: location as string,
        assigned: assigned as string,
        target: target as string,
        confirmed: confirmed as string,
        gap: gap as string,
        starts: starts as string,
        status: status as Badge,
        tab,
      });
    }
  }
  return out;
}

export const SEED_ROSTER_ENTRIES: RosterEntry[] = buildRosterEntries();
