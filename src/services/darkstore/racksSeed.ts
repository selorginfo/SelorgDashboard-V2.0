import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import type { DsRack, DsRackStoreSummary } from "@/types/darkstore";
import type { Badge } from "@/types/common";

const CONFIG = DARKSTORE_CONFIGS.racks;

/** Reshapes the already-transcribed `racks` "All racks" rows into typed rack records. Read-only —
 * "Near capacity" and "Inactive" are derived from this list client-side rather than re-read from
 * their own (overlapping) seeded tabs, per the plan's "reuse the same card, different slice". */
function buildRacks(): DsRack[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows["All racks"] ?? [];
  return rows.map((row) => {
    const [id, barcode, store, zone, capacity, occupied, available, status] = row;
    return {
      id: id as string,
      barcode: barcode as string,
      store: store as string,
      zone: zone as string,
      capacity: Number(capacity) || 0,
      occupied: Number(occupied) || 0,
      available: Number(available) || 0,
      status: status as Badge,
    };
  });
}

function buildStoreSummaries(): DsRackStoreSummary[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows["By store"] ?? [];
  return rows.map((row) => {
    const [store, , rackCount, zones, capacity, occupied, available, status] = row;
    return {
      store: store as string,
      rackCount: rackCount as string,
      zones: zones as string,
      capacity: Number(capacity) || 0,
      occupied: Number(occupied) || 0,
      available: Number(available) || 0,
      status: status as Badge,
    };
  });
}

export const SEED_RACKS: DsRack[] = buildRacks();
export const SEED_RACK_STORE_SUMMARIES: DsRackStoreSummary[] = buildStoreSummaries();
