import { beforeEach, describe, expect, it } from "vitest";
import { mockPromotionsService } from "@/services/catalog/promotionsService.mock";

describe("mockPromotionsService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("pauses a live coupon", async () => {
    const coupons = await mockPromotionsService.listCoupons();
    const target = coupons.find((c) => c.status.label === "Live")!;
    expect(target).toBeDefined();

    const updated = await mockPromotionsService.setCampaignStatus("coupon", target.code, "pause");
    expect(updated.status.label).toBe("Paused");
    expect(updated.status.tone).toBe("grey");
  });

  it("activates a scheduled coupon", async () => {
    const coupons = await mockPromotionsService.listCoupons();
    const target = coupons.find((c) => c.status.label === "Scheduled")!;
    expect(target).toBeDefined();

    const updated = await mockPromotionsService.setCampaignStatus("coupon", target.code, "activate");
    expect(updated.status.label).toBe("Live");
    expect(updated.status.tone).toBe("green");
  });

  it("pauses a live promotion", async () => {
    const promotions = await mockPromotionsService.listPromotions();
    const target = promotions.find((p) => p.status.label === "Live")!;
    expect(target).toBeDefined();

    const updated = await mockPromotionsService.setCampaignStatus("promotion", target.code, "pause");
    expect(updated.status.label).toBe("Paused");
    expect(updated.status.tone).toBe("grey");
  });

  it("throws for an unknown campaign code", async () => {
    await expect(mockPromotionsService.setCampaignStatus("coupon", "UNKNOWN", "pause")).rejects.toThrow();
  });
});
