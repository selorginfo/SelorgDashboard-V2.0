import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import type { DsInventoryRow } from "@/types/darkstore";
import type { Badge } from "@/types/common";

const CONFIG = DARKSTORE_CONFIGS["store-inv"];

/** Reshapes the already-transcribed `store-inv` rows into the flat row shape the bespoke
 * inventory layout renders, tagged per tab — mirrors warehouse/inventorySeed.ts exactly. */
function buildSeed(): DsInventoryRow[] {
  if (!CONFIG) return [];
  const items: DsInventoryRow[] = [];
  let counter = 0;
  for (const [tab, rows] of Object.entries(CONFIG.rows)) {
    for (const row of rows) {
      const [sku, product, store, available, reserved, pickedToday, source, status] = row;
      items.push({
        id: `ds-inv-${counter++}`,
        tab,
        sku: sku as string,
        product: product as string,
        store: store as string,
        available: available as string,
        reserved: reserved as string,
        pickedToday: pickedToday as string,
        source: source as string,
        status: status as Badge,
      });
    }
  }
  return items;
}

export const SEED_DS_INVENTORY: DsInventoryRow[] = buildSeed();
