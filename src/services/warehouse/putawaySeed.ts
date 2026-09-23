import { WAREHOUSE_CONFIGS } from "@/services/workspace/data/warehouse";
import type { PutawayTask } from "@/types/warehouse";
import type { Badge } from "@/types/common";

/** Reshapes the "Putaway queue" + "Confirmed" rows already transcribed in
 * workspace/data/warehouse.ts into one flat, mutable PutawayTask list — a task moves from the
 * queue to Confirmed in place by flipping `status`, not by living in two separate arrays. */
function buildSeed(): PutawayTask[] {
  const config = WAREHOUSE_CONFIGS.putaway;
  if (!config) return [];
  const tabs = ["Putaway queue", "Confirmed"];
  const items: PutawayTask[] = [];
  for (const tab of tabs) {
    const rows = config.rows[tab] ?? [];
    for (const row of rows) {
      const [id, grn, sku, quantity, batch, suggested, assigned, status] = row;
      items.push({
        id: id as string,
        grn: grn as string,
        sku: sku as string,
        quantity: quantity as string,
        batch: batch as string,
        suggested: suggested as string,
        assigned: assigned as string,
        status: status as Badge,
      });
    }
  }
  return items;
}

export const SEED_PUTAWAY_TASKS: PutawayTask[] = buildSeed();
