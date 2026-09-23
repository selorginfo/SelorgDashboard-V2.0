import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_COUPONS, SEED_PROMOTIONS, SEED_BANNERS } from "@/services/catalog/promotionsSeed";
import { COMMERCE_CONFIGS } from "@/services/workspace/data/commerce";
import type { PromoCard, PromoKind } from "@/types/promotions";
import type { PromotionsService } from "@/services/catalog/promotionsService";

const couponsTable = createMockTable<PromoCard>("selorg.promotions.coupons", SEED_COUPONS);
const promotionsTable = createMockTable<PromoCard>("selorg.promotions.promotions", SEED_PROMOTIONS);

function tableFor(kind: PromoKind) {
  return kind === "coupon" ? couponsTable : promotionsTable;
}

export const mockPromotionsService: PromotionsService = {
  async listCoupons() {
    await mockDelay();
    return couponsTable.all();
  },

  async listPromotions() {
    await mockDelay();
    return promotionsTable.all();
  },

  async listBanners() {
    await mockDelay();
    return SEED_BANNERS;
  },

  async listAnalytics() {
    await mockDelay();
    return COMMERCE_CONFIGS.promotions?.rows.Analytics ?? [];
  },

  async setCampaignStatus(kind, code, action, _id?) {
    await mockDelay(200);
    void _id;
    const table = tableFor(kind);
    let updated: PromoCard | undefined;
    table.update((rows) =>
      rows.map((card) => {
        if (card.code !== code) return card;
        updated =
          action === "pause"
            ? { ...card, status: { label: "Paused", tone: "grey" } }
            : { ...card, status: { label: "Live", tone: "green" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`${kind === "coupon" ? "Coupon" : "Promotion"} ${code} not found`);
    return updated;
  },

  async createCampaign(input) {
    await mockDelay(200);
    const code = (input.code && input.code.trim().toUpperCase()) || `MOCK${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const card: PromoCard = {
      code,
      kind: "coupon",
      type: "Coupon",
      scope: "All stores",
      value: `${input.discountValue ?? 10}%`,
      minOrder: `₹${input.minOrderValue ?? 0}`,
      usage: "0 / —",
      window: "Today – +30d",
      status: { label: "Live", tone: "green" },
    };
    couponsTable.update((rows) => [card, ...rows]);
    return card;
  },
};
