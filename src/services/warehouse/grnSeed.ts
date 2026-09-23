import { WAREHOUSE_CONFIGS } from "@/services/workspace/data/warehouse";
import type { Grn } from "@/types/warehouse";
import type { Badge } from "@/types/common";

/** Reshapes the "Receiving queue" rows already transcribed in workspace/data/warehouse.ts into
 * the flat Grn shape the bespoke receiving layout persists and mutates. */
function buildSeed(): Grn[] {
  const config = WAREHOUSE_CONFIGS.inbound;
  if (!config) return [];
  const rows = config.rows["Receiving queue"] ?? [];
  return rows.map((row) => {
    const [id, supplier, sku, expected, received, accepted, rejected, status] = row;
    return {
      id: id as string,
      supplier: supplier as string,
      sku: sku as string,
      expected: expected as string,
      received: received as string,
      accepted: accepted as string,
      rejected: rejected as string,
      status: status as Badge,
    };
  });
}

export const SEED_GRNS: Grn[] = buildSeed();
