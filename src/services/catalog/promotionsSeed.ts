import { COMMERCE_CONFIGS } from "@/services/workspace/data/commerce";
import type { PromoCard, PromoBanner, PromoKind } from "@/types/promotions";
import type { Badge } from "@/types/common";

const CONFIG = COMMERCE_CONFIGS.promotions;

/** Reshapes the already-transcribed `promotions` "Coupons"/"Promotions" rows into campaign cards —
 * same "reuse the same transcribed data, reshaped" approach as catalogSeed.ts. */
function buildCards(tab: "Coupons" | "Promotions", kind: PromoKind): PromoCard[] {
  const rows = CONFIG?.rows[tab] ?? [];
  return rows.map((row) => {
    const [code, type, scope, value, minOrder, usage, window, status] = row;
    return {
      kind,
      code: code as string,
      type: type as string,
      scope: scope as string,
      value: value as string,
      minOrder: minOrder as string,
      usage: usage as string,
      window: window as string,
      status: status as Badge,
    };
  });
}

export const SEED_COUPONS: PromoCard[] = buildCards("Coupons", "coupon");
export const SEED_PROMOTIONS: PromoCard[] = buildCards("Promotions", "promotion");

/** Banners row shape (same 8 columns as coupons/promotions, semantically repurposed):
 * [name, type, scope, slot, minOrder("—"), views, window, status]. */
function buildBanners(): PromoBanner[] {
  const rows = CONFIG?.rows.Banners ?? [];
  return rows.map((row) => {
    const [name, , , slot, , views, window, status] = row;
    return {
      name: name as string,
      slot: slot as string,
      views: views as string,
      window: window as string,
      status: status as Badge,
    };
  });
}

export const SEED_BANNERS: PromoBanner[] = buildBanners();
