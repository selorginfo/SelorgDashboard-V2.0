import type { PromoCard, PromoBanner, PromoKind } from "@/types/promotions";
import type { WorkspaceRow } from "@/types/common";

export interface PromotionsService {
  listCoupons(): Promise<PromoCard[]>;
  listPromotions(): Promise<PromoCard[]>;
  listBanners(): Promise<PromoBanner[]>;
  /** Already analytics-shaped in the source data — read-only, no service-level reshape needed. */
  listAnalytics(): Promise<WorkspaceRow[]>;
  /** The one real mutation: pause a Live campaign, or activate a Scheduled/Paused one. */
  setCampaignStatus(kind: PromoKind, code: string, action: "pause" | "activate", id?: string): Promise<PromoCard>;
  /** Create a coupon/campaign via merch pricing API. */
  createCampaign(input: {
    code?: string;
    name?: string;
    discountType?: "percentage" | "flat" | "percent" | "fixed";
    discountValue?: number;
    minOrderValue?: number;
  }): Promise<PromoCard>;
}
