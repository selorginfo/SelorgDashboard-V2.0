import { WAREHOUSE_CONFIGS } from "@/services/workspace/data/warehouse";
import type { Row } from "@/services/workspace/data/helpers";
import type { Transfer } from "@/types/warehouse";
import type { Badge } from "@/types/common";

/** Reshapes the "All" + "Pending approval" rows already transcribed in
 * workspace/data/warehouse.ts into one flat Transfer list for the kanban board. "All" carries
 * the canonical status for a transfer once it's been approved; "Pending approval" adds the two
 * transfers that haven't reached "All" yet — deduped by transfer id, "All" wins on overlap. */
function buildSeed(): Transfer[] {
  const config = WAREHOUSE_CONFIGS.transfers;
  if (!config) return [];
  const toTransfer = (row: Row): Transfer => {
    const [id, toStore, priority, requested, approved, dispatched, received, status] = row;
    return {
      id: id as string,
      toStore: toStore as string,
      priority: priority as string,
      requested: requested as string,
      approved: approved as string,
      dispatched: dispatched as string,
      received: received as string,
      status: status as Badge,
    };
  };

  const all = (config.rows.All ?? []).map(toTransfer);
  const seenIds = new Set(all.map((t) => t.id));
  const pending = (config.rows["Pending approval"] ?? []).map(toTransfer).filter((t) => !seenIds.has(t.id));

  return [...pending, ...all];
}

export const SEED_TRANSFERS: Transfer[] = buildSeed();
