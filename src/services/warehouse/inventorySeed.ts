import { WAREHOUSE_CONFIGS } from "@/services/workspace/data/warehouse";
import type { WhInventoryRow } from "@/types/warehouse";
import type { Badge } from "@/types/common";

/** Reshapes the already-transcribed `wh-inv` rows (workspace/data/warehouse.ts) into the flat
 * row shape the bespoke inventory layout renders, tagged per tab — same reuse pattern as
 * cms/homeSectionSeed.ts. Read-only, so this is a plain const rather than a mock-backed table. */
function buildSeed(): WhInventoryRow[] {
  const config = WAREHOUSE_CONFIGS["wh-inv"];
  if (!config) return [];
  const items: WhInventoryRow[] = [];
  let counter = 0;
  for (const [tab, rows] of Object.entries(config.rows)) {
    for (const row of rows) {
      const [sku, product, batch, expiry, available, reserved, location, status] = row;
      items.push({
        id: `wh-inv-${counter++}`,
        tab,
        sku: sku as string,
        product: product as string,
        batch: batch as string,
        expiry: expiry as string,
        available: available as string,
        reserved: reserved as string,
        location: location as string,
        status: status as Badge,
      });
    }
  }
  return items;
}

export const SEED_WH_INVENTORY: WhInventoryRow[] = buildSeed();
