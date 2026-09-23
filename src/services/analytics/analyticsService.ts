import { api } from "@/lib/apiClient";

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d";

export interface RealtimeMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
  conversionRate: number;
}

export interface OperationalMetrics {
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  cancellationRate?: number;
  refundRate?: number;
  averageRating?: number;
  orderFulfillmentRate?: number;
}

export interface CustomerMetrics {
  totalCustomers?: number;
  newCustomers?: number;
  returningCustomers?: number;
  customerRetentionRate?: number;
  averageLifetimeValue?: number;
  churnRate?: number;
  customerAcquisitionCost?: number;
}

export interface FinancialSummary {
  totalRevenue?: number;
  totalOrders?: number;
  totalDiscount?: number;
  totalDeliveryFee?: number;
  averageOrderValue?: number;
}

export interface PickerAnalytics {
  total?: number;
  punchedIn?: number;
  byStatus?: Record<string, number>;
  byRole?: Record<string, number>;
}

export interface NamedMetricRow {
  [key: string]: string | number | undefined;
}

function rangeQs(range: AnalyticsRange) {
  return `?range=${encodeURIComponent(range)}`;
}

async function getOrEmpty<T>(path: string, fallback: T): Promise<T> {
  try {
    return await api.get<T>(path);
  } catch {
    return fallback;
  }
}

export function formatRupees(amount: number): string {
  const n = Number(amount) || 0;
  // Avoid seed-colliding compact forms like "₹9.84L" / "₹2.14 Cr" from REPORTS_CONFIGS.
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(2)} Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(2)} Lakh`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}k`;
  return `₹${Math.round(n)}`;
}

export function formatPct(n: number | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return "0%";
  return `${v.toFixed(1)}%`;
}

export const analyticsService = {
  realtime(range: AnalyticsRange = "24h") {
    return getOrEmpty<RealtimeMetrics>(`/api/v1/admin/analytics/realtime${rangeQs(range)}`, {
      totalRevenue: 0,
      totalOrders: 0,
      activeUsers: 0,
      averageOrderValue: 0,
      revenueGrowth: 0,
      ordersGrowth: 0,
      usersGrowth: 0,
      conversionRate: 0,
    });
  },
  operational(range: AnalyticsRange = "24h") {
    return getOrEmpty<OperationalMetrics>(`/api/v1/admin/analytics/operational${rangeQs(range)}`, {});
  },
  customers(range: AnalyticsRange = "30d") {
    return getOrEmpty<CustomerMetrics>(`/api/v1/admin/analytics/customers${rangeQs(range)}`, {});
  },
  financial(range: AnalyticsRange = "24h") {
    return getOrEmpty<FinancialSummary>(`/api/v1/admin/analytics/financial-summary${rangeQs(range)}`, {});
  },
  revenue(range: AnalyticsRange = "24h") {
    return getOrEmpty<NamedMetricRow[] | { list?: NamedMetricRow[] }>(
      `/api/v1/admin/analytics/revenue${rangeQs(range)}`,
      [],
    );
  },
  categories(range: AnalyticsRange = "24h") {
    return getOrEmpty<NamedMetricRow[] | { list?: NamedMetricRow[] }>(
      `/api/v1/admin/analytics/categories${rangeQs(range)}`,
      [],
    );
  },
  paymentMethods(range: AnalyticsRange = "24h") {
    return getOrEmpty<NamedMetricRow[] | { list?: NamedMetricRow[] }>(
      `/api/v1/admin/analytics/payment-methods${rangeQs(range)}`,
      [],
    );
  },
  products(range: AnalyticsRange = "24h") {
    return getOrEmpty<NamedMetricRow[] | { list?: NamedMetricRow[] }>(
      `/api/v1/admin/analytics/products${rangeQs(range)}`,
      [],
    );
  },
  regional(range: AnalyticsRange = "24h") {
    return getOrEmpty<NamedMetricRow[] | { list?: NamedMetricRow[] }>(
      `/api/v1/admin/analytics/regional${rangeQs(range)}`,
      [],
    );
  },
  growth(range: AnalyticsRange = "30d") {
    return getOrEmpty<NamedMetricRow[] | { list?: NamedMetricRow[] }>(
      `/api/v1/admin/analytics/growth${rangeQs(range)}`,
      [],
    );
  },
  pickers() {
    return getOrEmpty<PickerAnalytics>(`/api/v1/admin/analytics/pickers`, {});
  },
  inventoryHealth() {
    return getOrEmpty<NamedMetricRow | NamedMetricRow[]>(`/api/v1/admin/analytics/inventory-health`, {});
  },
  exportOverview(range: AnalyticsRange = "30d") {
    return getOrEmpty<unknown>(
      `/api/v1/admin/analytics/export?report=overview&range=${encodeURIComponent(range)}`,
      {},
    );
  },
};

export function asRows(data: NamedMetricRow[] | { list?: NamedMetricRow[] } | unknown): NamedMetricRow[] {
  if (Array.isArray(data)) return data as NamedMetricRow[];
  if (data && typeof data === "object" && Array.isArray((data as { list?: unknown }).list)) {
    return (data as { list: NamedMetricRow[] }).list;
  }
  return [];
}
