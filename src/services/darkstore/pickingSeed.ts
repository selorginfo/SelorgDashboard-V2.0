import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import type { PickingOrder, PickerPerformance } from "@/types/darkstore";
import type { Badge } from "@/types/common";

const CONFIG = DARKSTORE_CONFIGS.picking;

/** Reshapes the already-transcribed `picking` rows (workspace/data/darkstores.ts) into typed,
 * mutable orders for the progress-card tabs — same reuse pattern as warehouse/inventorySeed.ts. */
function buildOrders(): PickingOrder[] {
  if (!CONFIG) return [];
  const tabs: PickingOrder["tab"][] = ["Picking queue", "Packing", "Exceptions"];
  const items: PickingOrder[] = [];
  for (const tab of tabs) {
    const rows = CONFIG.rows[tab] ?? [];
    for (const row of rows) {
      const [id, store, picker, itemsCount, picked, started, elapsed, status] = row;
      items.push({
        id: id as string,
        store: store as string,
        picker: picker as string,
        items: Number(itemsCount) || 0,
        picked: Number(picked) || 0,
        started: started as string,
        elapsed: elapsed as string,
        status: status as Badge,
        tab,
      });
    }
  }
  return items;
}

function buildPerformance(): PickerPerformance[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows["Picker performance"] ?? [];
  return rows.map((row) => {
    const [picker, store, shift, orders, items, accuracy, avgTime, status] = row;
    return {
      picker: picker as string,
      store: store as string,
      shift: shift as string,
      orders: orders as string,
      items: items as string,
      accuracy: accuracy as string,
      avgTime: avgTime as string,
      status: status as Badge,
    };
  });
}

export const SEED_PICKING_ORDERS: PickingOrder[] = buildOrders();
export const SEED_PICKER_PERFORMANCE: PickerPerformance[] = buildPerformance();

/** Roster a "Reassign picker" action can hand a task to — reused from the picker names already
 * present in the transcribed data. */
export const PICKER_ROSTER = ["Ravi M.", "Deepa K.", "Meena T.", "Anita S.", "Suresh P."];
