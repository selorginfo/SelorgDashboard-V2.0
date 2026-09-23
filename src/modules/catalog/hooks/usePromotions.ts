import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { promotionsService } from "@/services/catalog";
import type { PromoKind } from "@/types/promotions";

const COUPONS_KEY = ["promotions-coupons"];
const PROMOTIONS_KEY = ["promotions-promotions"];
const BANNERS_KEY = ["promotions-banners"];
const ANALYTICS_KEY = ["promotions-analytics"];

export function useCoupons() {
  return useQuery({ queryKey: COUPONS_KEY, queryFn: () => promotionsService.listCoupons() });
}

export function usePromoCampaigns() {
  return useQuery({ queryKey: PROMOTIONS_KEY, queryFn: () => promotionsService.listPromotions() });
}

export function useBanners() {
  return useQuery({ queryKey: BANNERS_KEY, queryFn: () => promotionsService.listBanners() });
}

export function usePromoAnalytics() {
  return useQuery({ queryKey: ANALYTICS_KEY, queryFn: () => promotionsService.listAnalytics() });
}

export function useSetCampaignStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      kind,
      code,
      action,
      id,
    }: {
      kind: PromoKind;
      code: string;
      action: "pause" | "activate";
      id?: string;
    }) => promotionsService.setCampaignStatus(kind, code, action, id),
    onSuccess: (_, vars) =>
      queryClient.invalidateQueries({ queryKey: vars.kind === "coupon" ? COUPONS_KEY : PROMOTIONS_KEY }),
  });
}

export function useCreateCampaign() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input?: {
      code?: string;
      name?: string;
      discountType?: "percentage" | "flat" | "percent" | "fixed";
      discountValue?: number;
      minOrderValue?: number;
    }) => promotionsService.createCampaign(input ?? {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: COUPONS_KEY });
      queryClient.invalidateQueries({ queryKey: PROMOTIONS_KEY });
    },
  });
}
