import type { Badge } from "@/types/common";

export type PromoKind = "coupon" | "promotion";

/** A coupon or promotion in the `promotions` campaign-card layout — "Coupons"/"Promotions" tabs
 * (columns: Code/name, Type, Scope, Value, Min order, Usage, Window, Status from
 * workspace/data/commerce.ts COMMERCE_CONFIGS.promotions). Rendered as a lightweight campaign
 * card grid rather than a table or kanban — the real transcribed data only carries 4 lifecycle
 * states (Live/Scheduled/Expired/Draft), not enough states to justify a kanban board. */
export interface PromoCard {
  kind: PromoKind;
  /** Backend document id when available (required for status mutations). */
  id?: string;
  code: string;
  type: string;
  scope: string;
  value: string;
  minOrder: string;
  usage: string;
  window: string;
  status: Badge;
}

/** A banner in the "Banners" tab — rendered as a simpler card row (name, slot, views, window,
 * status) rather than the full campaign card used for coupons/promotions. */
export interface PromoBanner {
  name: string;
  slot: string;
  views: string;
  window: string;
  status: Badge;
}
