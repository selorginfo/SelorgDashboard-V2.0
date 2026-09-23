import { useQuery } from "@tanstack/react-query";
import {
  analyticsService,
  asRows,
  formatPct,
  formatRupees,
  type AnalyticsRange,
} from "@/services/analytics/analyticsService";

export type ReportKind = "overall" | "sales" | "ops" | "people" | "customer";

export function useRealtime(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "realtime", range],
    queryFn: () => analyticsService.realtime(range),
  });
}

export function useOperational(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "operational", range],
    queryFn: () => analyticsService.operational(range),
  });
}

export function useCustomerMetrics(range: AnalyticsRange = "30d") {
  return useQuery({
    queryKey: ["analytics", "customers", range],
    queryFn: () => analyticsService.customers(range),
  });
}

export function useFinancial(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "financial", range],
    queryFn: () => analyticsService.financial(range),
  });
}

export function useRevenueBreakdown(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "revenue", range],
    queryFn: async () => asRows(await analyticsService.revenue(range)),
  });
}

export function useCategories(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "categories", range],
    queryFn: async () => asRows(await analyticsService.categories(range)),
  });
}

export function usePaymentMethods(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "payment-methods", range],
    queryFn: async () => asRows(await analyticsService.paymentMethods(range)),
  });
}

export function useProducts(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "products", range],
    queryFn: async () => asRows(await analyticsService.products(range)),
  });
}

export function useRegional(range: AnalyticsRange = "24h") {
  return useQuery({
    queryKey: ["analytics", "regional", range],
    queryFn: async () => asRows(await analyticsService.regional(range)),
  });
}

export function useGrowth(range: AnalyticsRange = "30d") {
  return useQuery({
    queryKey: ["analytics", "growth", range],
    queryFn: async () => asRows(await analyticsService.growth(range)),
  });
}

export function usePickerAnalytics() {
  return useQuery({
    queryKey: ["analytics", "pickers"],
    queryFn: () => analyticsService.pickers(),
  });
}

export function useInventoryHealth() {
  return useQuery({
    queryKey: ["analytics", "inventory-health"],
    queryFn: () => analyticsService.inventoryHealth(),
  });
}

export function useAnalyticsExport(range: AnalyticsRange = "30d") {
  return useQuery({
    queryKey: ["analytics", "export", range],
    queryFn: () => analyticsService.exportOverview(range),
  });
}

export { formatRupees, formatPct };
