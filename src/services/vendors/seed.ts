import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import type { Vendor } from "@/types/vendor";
import type { Badge } from "@/types/common";

/** Reuses the "vendors" → "All vendors" rows already transcribed in workspace/data/workforce.ts. */
function buildSeed(): Vendor[] {
  const rows = WORKFORCE_CONFIGS.vendors?.rows["All vendors"] ?? [];
  return rows.map((row, i) => {
    const [name, category, contact, skusSupplied, fillRate, rejectRate, spendMtd, status] = row;
    return {
      id: `vendor-${i}`,
      name: name as string,
      category: category as string,
      contact: contact as string,
      skusSupplied: skusSupplied as string,
      fillRate: fillRate as string,
      rejectRate: rejectRate as string,
      spendMtd: spendMtd as string,
      status: status as Badge,
    };
  });
}

export const SEED_VENDORS: Vendor[] = buildSeed();
