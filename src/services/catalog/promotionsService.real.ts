import { api } from "@/lib/apiClient";
import type { PromoCard, PromoBanner, PromoKind } from "@/types/promotions";
import type { Badge, WorkspaceRow } from "@/types/common";
import type { PromotionsService } from "./promotionsService";

type RawCoupon = Record<string, unknown>;

function unwrapList(res: unknown): RawCoupon[] {
  if (Array.isArray(res)) return res as RawCoupon[];
  if (!res || typeof res !== "object") return [];
  const r = res as { data?: unknown; list?: unknown; items?: unknown; coupons?: unknown };
  if (Array.isArray(r.data)) return r.data as RawCoupon[];
  if (Array.isArray(r.list)) return r.list as RawCoupon[];
  if (Array.isArray(r.items)) return r.items as RawCoupon[];
  if (Array.isArray(r.coupons)) return r.coupons as RawCoupon[];
  return [];
}

function statusBadge(status: unknown, isActive: unknown): Badge {
  const s = String(status ?? "").toLowerCase();
  if (s === "paused" || isActive === false) return { label: "Paused", tone: "grey" };
  if (s === "expired") return { label: "Expired", tone: "grey" };
  if (s === "scheduled" || s === "draft") return { label: "Scheduled", tone: "blue" };
  if (s === "active" || isActive === true || s === "live") return { label: "Live", tone: "green" };
  return { label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Live", tone: "green" };
}

function formatWindow(raw: RawCoupon): string {
  const start = raw.startDate || raw.validFrom;
  const end = raw.endDate || raw.validTo;
  const s = start ? new Date(String(start)) : null;
  const e = end ? new Date(String(end)) : null;
  if (s && e && !Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
    return `${s.toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
    })}`;
  }
  return "Always";
}

function formatValue(raw: RawCoupon): string {
  const dt = String(raw.discountType ?? "").toLowerCase();
  const v = Number(raw.discountValue ?? 0);
  if (dt.includes("percent") || dt === "percentage") return `${v}%`;
  if (dt.includes("free") || dt.includes("delivery")) return "Free delivery";
  return `₹${v}`;
}

function formatType(raw: RawCoupon): string {
  const dt = String(raw.discountType ?? "Coupon");
  if (/percent/i.test(dt)) return "Percentage";
  if (/flat|fixed/i.test(dt)) return "Fixed discount";
  if (/free|delivery/i.test(dt)) return "Free delivery";
  if (/bogo/i.test(dt)) return "BOGO";
  if (/cashback/i.test(dt)) return "Cashback";
  return dt || "Coupon";
}

function mapCoupon(raw: RawCoupon, kind: PromoKind = "coupon"): PromoCard {
  const usageLimit = raw.usageLimit;
  const usageCount = Number(raw.usageCount ?? 0);
  const usage =
    usageLimit != null && usageLimit !== ""
      ? `${usageCount.toLocaleString("en-IN")} / ${Number(usageLimit).toLocaleString("en-IN")}`
      : `${usageCount.toLocaleString("en-IN")} uses`;
  const zones = raw.targetZones;
  const scope =
    Array.isArray(zones) && zones.length > 0
      ? zones.slice(0, 2).map(String).join(", ")
      : String(raw.scope ?? "All stores");

  return {
    kind,
    id: String(raw.id ?? raw._id ?? "").trim() || undefined,
    code: String(raw.code ?? raw.name ?? "—").toUpperCase(),
    type: formatType(raw),
    scope,
    value: formatValue(raw),
    minOrder: `₹${Number(raw.minOrderValue ?? raw.minOrderAmount ?? 0)}`,
    usage,
    window: formatWindow(raw),
    status: statusBadge(raw.status, raw.isActive),
  };
}

function mapToAnalyticsRow(card: PromoCard): WorkspaceRow {
  return [card.code, card.type, card.scope, card.value, card.usage, card.window, "—", card.status];
}

export const realPromotionsService: PromotionsService = {
  async listCoupons(): Promise<PromoCard[]> {
    const res = await api.get<unknown>("/api/v1/customer/admin/coupons");
    return unwrapList(res).map((row) => mapCoupon(row, "coupon"));
  },

  async listPromotions(): Promise<PromoCard[]> {
    // No separate promotions collection — treat non-standard coupon types as "promotions"
    const res = await api.get<unknown>("/api/v1/customer/admin/coupons");
    return unwrapList(res)
      .filter((row) => {
        const t = String(row.discountType ?? "").toLowerCase();
        return /bogo|tiered|cashback|category|promotion/.test(t) || String(row.type ?? "").toLowerCase() === "promotion";
      })
      .map((row) => mapCoupon(row, "promotion"));
  },

  async listBanners(): Promise<PromoBanner[]> {
    const res = await api.get<unknown>("/api/v1/customer/admin/banners");
    const rows = unwrapList(res);

    return rows.map((raw) => {
      const title = String(raw.title ?? raw.bannerId ?? raw.name ?? "Banner");
      const slot = String(raw.slot ?? "—");
      const isActive = raw.isActive !== false;
      return {
        name: title,
        slot,
        views: String(raw.views ?? raw.viewCount ?? "—"),
        window: formatWindow(raw),
        status: isActive
          ? { label: "Live", tone: "green" as const }
          : { label: "Off", tone: "grey" as const },
      };
    });
  },

  async listAnalytics(): Promise<WorkspaceRow[]> {
    // Derive from live coupons — /admin/analytics/revenue is not coupon-row shaped
    const coupons = await realPromotionsService.listCoupons();
    return coupons.map(mapToAnalyticsRow);
  },

  async setCampaignStatus(kind: PromoKind, code: string, action: "pause" | "activate", id?: string): Promise<PromoCard> {
    void kind;
    const status = action === "activate" ? "active" : "paused";
    const payload = { status, isActive: action === "activate" };
    const key = (id && id.trim()) || code;
    try {
      const updated = await api.put<RawCoupon>(`/api/v1/customer/admin/coupons/${encodeURIComponent(key)}`, payload);
      return mapCoupon(updated, kind);
    } catch {
      const updated = await api.put<RawCoupon>(`/api/v1/merch/pricing/coupons/${encodeURIComponent(key)}`, payload);
      return mapCoupon(updated, kind);
    }
  },

  async createCampaign(input): Promise<PromoCard> {
    const code =
      (input.code && input.code.trim().toUpperCase()) ||
      `SEL${Date.now().toString(36).toUpperCase().slice(-6)}`;
    const created = await api.post<RawCoupon>("/api/v1/merch/pricing/coupons", {
      code,
      name: input.name || code,
      discountType: input.discountType || "percentage",
      discountValue: input.discountValue ?? 10,
      minOrderValue: input.minOrderValue ?? 0,
      status: "active",
    });
    return mapCoupon(created, "coupon");
  },
};
