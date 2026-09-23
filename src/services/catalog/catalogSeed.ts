import { CATALOG_CONFIGS } from "@/services/workspace/data/catalog";
import type { CatalogProduct } from "@/types/catalog";
import type { Badge } from "@/types/common";

const CONFIG = CATALOG_CONFIGS.catalog;

/** Reshapes the already-transcribed `catalog` "Products" rows into product cards — same
 * "reuse the same transcribed data, reshaped" approach as storesSeed.ts. */
function buildProducts(): CatalogProduct[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows.Products ?? [];
  return rows.map((row) => {
    const [sku, name, category, unit, mrp, selling, storesLive, status] = row;
    return {
      _id: sku as string,
      sku: sku as string,
      name: name as string,
      category: category as string,
      unit: unit as string,
      mrp: mrp as string,
      selling: selling as string,
      storesLive: storesLive as string,
      status: status as Badge,
    };
  });
}

export const SEED_CATALOG_PRODUCTS: CatalogProduct[] = buildProducts();
