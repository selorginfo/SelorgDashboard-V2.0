import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import type { WorkforceEarning, WorkerKind } from "@/types/workforce";
import type { Badge } from "@/types/common";

const RIDER_CONFIG = WORKFORCE_CONFIGS["rider-earn"];
const PICKER_CONFIG = WORKFORCE_CONFIGS["picker-earn"];

/** Every ledger tab from the source config is kept as its own independent bucket (the same
 * earning id can appear under a different status in a different view — e.g. ERN-R-8841 is
 * "Settled" under "This week" and "Paid" under "Paid" — matching how the approved design's own
 * per-tab tables are built, rather than inventing a single reconciled status). Row cells between
 * the id and the net amount become generic `metrics`, zipped against the module's own column
 * headers, so rider (Deliveries/Base/Incentive/Deduction) and picker (Orders/Items/Base/Incentive)
 * shapes both fall out of the same code without hardcoding either. */
function buildEarnings(kind: WorkerKind): WorkforceEarning[] {
  const config = kind === "rider" ? RIDER_CONFIG : PICKER_CONFIG;
  if (!config) return [];
  const columns = config.columns;
  const out: WorkforceEarning[] = [];
  for (const tab of config.tabs) {
    for (const row of config.rows[tab] ?? []) {
      const ref = row[0] as string;
      const person = row[1] as string;
      const net = row[row.length - 2] as string;
      const status = row[row.length - 1] as Badge;
      const metrics = row.slice(2, row.length - 2).map((value, i) => ({
        label: columns[i + 2] as string,
        value: value as string,
      }));
      out.push({
        id: `${kind}-${tab.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${ref}`,
        kind,
        ref,
        person,
        metrics,
        net,
        status,
        tab,
      });
    }
  }
  return out;
}

export const SEED_RIDER_EARNINGS: WorkforceEarning[] = buildEarnings("rider");
export const SEED_PICKER_EARNINGS: WorkforceEarning[] = buildEarnings("picker");

export function seedFor(kind: WorkerKind): WorkforceEarning[] {
  return kind === "rider" ? SEED_RIDER_EARNINGS : SEED_PICKER_EARNINGS;
}
