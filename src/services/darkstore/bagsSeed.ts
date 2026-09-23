import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import type { Bag } from "@/types/darkstore";
import type { Badge } from "@/types/common";

const CONFIG = DARKSTORE_CONFIGS.bags;

/** Reshapes the already-transcribed `bags` rows (workspace/data/darkstores.ts) into typed,
 * mutable bags for the progress-card tabs — same reuse pattern as warehouse/inventorySeed.ts. */
function buildBags(): Bag[] {
  if (!CONFIG) return [];
  // Least-advanced to most-advanced — a bag that appears in more than one tab in the source data
  // (e.g. BAG-000986 sits in both "Bag queue" and "Awaiting rack") keeps its furthest-along tab.
  const tabs: Bag["tab"][] = ["Bag queue", "Awaiting rack", "Racked", "Exceptions"];
  const byId = new Map<string, Bag>();
  for (const tab of tabs) {
    const rows = CONFIG.rows[tab] ?? [];
    for (const row of rows) {
      const [id, barcode, order, store, picker, scanned, rack, status] = row;
      const m = /(\d+)\s*\/\s*(\d+)/.exec(scanned as string);
      byId.set(id as string, {
        id: id as string,
        barcode: barcode as string,
        order: order as string,
        store: store as string,
        picker: picker as string,
        scanned: m ? Number(m[1]) : 0,
        total: m ? Number(m[2]) : 1,
        rack: rack as string,
        status: status as Badge,
        tab,
      });
    }
  }
  return Array.from(byId.values());
}

export const SEED_BAGS: Bag[] = buildBags();
