import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import type { DarkStoreCard } from "@/types/darkstore";
import type { Badge } from "@/types/common";

const CONFIG = DARKSTORE_CONFIGS.stores;

/** Reshapes the already-transcribed `stores` "All stores" rows into comparison cards — "At risk"
 * and "Low stock" tabs are derived from this list client-side (status / inventory badge), same
 * "reuse the same card, different slice" approach as racksSeed.ts. */
function buildStores(): DarkStoreCard[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows["All stores"] ?? [];
  return rows.map((row) => {
    const [store, manager, hours, capacity, activeOrders, pickers, inventory, status] = row;
    const name = store as string;
    const idMatch = /^(DS-\d+)/.exec(name);
    return {
      id: idMatch ? idMatch[1]! : name,
      store: name,
      manager: manager as string,
      hours: hours as string,
      capacityPct: Number(String(capacity).replace("%", "")) || 0,
      activeOrders: activeOrders as string,
      pickers: pickers as string,
      inventory: inventory as Badge,
      status: status as Badge,
    };
  });
}

export const SEED_DARK_STORES: DarkStoreCard[] = buildStores();
