import { api } from "@/lib/apiClient";
import type { DashboardSnapshot, DashboardAlert, StoreOpsRow, HourlyBar } from "@/modules/dashboard/types";
import type { DashboardService } from "./dashboardService";

interface RealtimeMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  averageOrderValue: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
  conversionRate: number;
}

interface HourPoint {
  hour?: string;
  orders?: number;
  revenue?: number;
}

interface OperationalMetrics {
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  cancellationRate?: number;
  refundRate?: number;
  averageRating?: number;
  orderFulfillmentRate?: number;
}

interface StoreRow {
  name?: string;
  storeName?: string;
  city?: string;
  orders?: number;
  orderCount?: number;
  pickRate?: number;
  packRate?: number;
  sla?: string | number;
  status?: string;
}

function formatRupees(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(2)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount}`;
}

function formatDelta(pct: number, suffix = "vs yesterday"): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct}% ${suffix}`;
}

function toHourly(points: HourPoint[]): HourlyBar[] {
  if (!points.length) return [];
  const max = Math.max(1, ...points.map((p) => Number(p.orders || 0)));
  return points.map((p) => {
    const orders = Number(p.orders || 0);
    const label = String(p.hour || "").replace(/\s*(AM|PM)/i, (_, m) => m.charAt(0));
    return {
      hour: label || String(p.hour || ""),
      heightPct: Math.round((orders / max) * 100),
      pendingPct: orders > 0 ? Math.min(40, Math.round((orders / max) * 25)) : 0,
    };
  });
}

function toAlerts(ops: OperationalMetrics): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];
  if ((ops.cancellationRate ?? 0) > 10) {
    alerts.push({
      id: "cancel-rate",
      title: "Cancellation rate elevated",
      detail: `${ops.cancellationRate}% of orders cancelled in range`,
      color: "var(--red-tx)",
      ago: "live",
      linkTo: "/orders",
    });
  }
  if ((ops.refundRate ?? 0) > 5) {
    alerts.push({
      id: "refund-rate",
      title: "Refund rate elevated",
      detail: `${ops.refundRate}% refund rate`,
      color: "var(--amber-tx)",
      ago: "live",
      linkTo: "/customers",
    });
  }
  if ((ops.orderFulfillmentRate ?? 100) < 50) {
    alerts.push({
      id: "fulfillment",
      title: "Fulfillment rate low",
      detail: `${ops.orderFulfillmentRate}% fulfillment`,
      color: "var(--amber-tx)",
      ago: "live",
      linkTo: "/orders",
    });
  }
  if ((ops.onTimeDeliveryRate ?? 100) < 80 && (ops.onTimeDeliveryRate ?? 0) > 0) {
    alerts.push({
      id: "sla",
      title: "On-time delivery below target",
      detail: `${ops.onTimeDeliveryRate}% on-time`,
      color: "var(--red-tx)",
      ago: "live",
      linkTo: "/deliveries",
    });
  }
  return alerts;
}

function toStoreRows(rows: StoreRow[]): StoreOpsRow[] {
  return rows.slice(0, 12).map((r) => {
    const slaVal = typeof r.sla === "number" ? `${r.sla}%` : String(r.sla || "—");
    const status = String(r.status || "Active");
    return {
      name: String(r.name || r.storeName || "Store"),
      city: String(r.city || "—"),
      orders: Number(r.orders ?? r.orderCount ?? 0),
      pick: Number(r.pickRate ?? 0),
      pack: Number(r.packRate ?? 0),
      sla: slaVal,
      slaColor: "var(--brand)",
      status,
      badgeTone: /closed|down|offline/i.test(status) ? "red" : /slow|warn/i.test(status) ? "amber" : "green",
    };
  });
}

function transform(
  m: RealtimeMetrics,
  hourly: HourlyBar[],
  alerts: DashboardAlert[],
  storeRows: StoreOpsRow[],
  ops: OperationalMetrics,
): DashboardSnapshot {
  return {
    heroKpis: [
      {
        label: "Orders today",
        value: m.totalOrders.toLocaleString("en-IN"),
        delta: formatDelta(m.ordersGrowth),
        deltaColor: m.ordersGrowth >= 0 ? "var(--brand)" : "var(--red-tx)",
        icon: "orders",
      },
      {
        label: "Revenue today",
        value: formatRupees(m.totalRevenue),
        delta: formatDelta(m.revenueGrowth),
        deltaColor: m.revenueGrowth >= 0 ? "var(--brand)" : "var(--red-tx)",
        icon: "revenue",
      },
      {
        label: "Active users",
        value: m.activeUsers.toLocaleString("en-IN"),
        delta: formatDelta(m.usersGrowth),
        deltaColor: m.usersGrowth >= 0 ? "var(--brand)" : "var(--red-tx)",
        icon: "active",
      },
      {
        label: "Avg order value",
        value: `₹${m.averageOrderValue.toLocaleString("en-IN")}`,
        delta: `${m.conversionRate}% conversion`,
        deltaColor: "var(--mu)",
        icon: "sla",
      },
    ],
    opsKpis: [
      { label: "Total orders", value: m.totalOrders.toLocaleString("en-IN") },
      { label: "Revenue", value: formatRupees(m.totalRevenue) },
      { label: "Active users", value: m.activeUsers.toLocaleString("en-IN") },
      { label: "Avg order value", value: `₹${m.averageOrderValue}` },
      {
        label: "Cancel rate",
        value: `${ops.cancellationRate ?? 0}%`,
        color: (ops.cancellationRate ?? 0) > 10 ? "var(--red-tx)" : undefined,
      },
      {
        label: "Fulfillment",
        value: `${ops.orderFulfillmentRate ?? 0}%`,
        color: (ops.orderFulfillmentRate ?? 0) < 50 ? "var(--amber-tx)" : "var(--brand)",
      },
    ],
    hourly,
    alerts,
    storeRows,
    supply: [
      { value: formatRupees(m.totalRevenue), label: "Revenue today" },
      { value: m.totalOrders.toLocaleString("en-IN"), label: "Orders today" },
      { value: m.activeUsers.toLocaleString("en-IN"), label: "Active users" },
      { value: `₹${m.averageOrderValue}`, label: "Avg order value" },
    ],
    delivery: [
      {
        label: "Orders growth",
        value: `${m.ordersGrowth}%`,
        pct: Math.min(100, Math.abs(m.ordersGrowth)),
        color: m.ordersGrowth >= 0 ? "var(--brand)" : "var(--red-tx)",
      },
      {
        label: "Revenue growth",
        value: `${m.revenueGrowth}%`,
        pct: Math.min(100, Math.abs(m.revenueGrowth)),
        color: m.revenueGrowth >= 0 ? "var(--brand)" : "var(--red-tx)",
      },
      {
        label: "On-time delivery",
        value: `${ops.onTimeDeliveryRate ?? 0}%`,
        pct: Math.min(100, Math.abs(ops.onTimeDeliveryRate ?? 0)),
        color: "var(--brand)",
      },
    ],
  };
}

const emptyMetrics: RealtimeMetrics = {
  totalRevenue: 0,
  totalOrders: 0,
  activeUsers: 0,
  averageOrderValue: 0,
  revenueGrowth: 0,
  ordersGrowth: 0,
  usersGrowth: 0,
  conversionRate: 0,
};

export const realDashboardService: DashboardService = {
  async getSnapshot(range = "24h"): Promise<DashboardSnapshot> {
    const q = `?range=${encodeURIComponent(range)}`;
    const [metricsRes, hourlyRes, opsRes, storesRes, darkstoresRes] = await Promise.all([
      api.get<RealtimeMetrics>(`/api/v1/admin/analytics/realtime${q}`).catch(() => emptyMetrics),
      api.get<HourPoint[] | { data?: HourPoint[] }>(`/api/v1/admin/analytics/orders-by-hour${q}`).catch(() => []),
      api.get<OperationalMetrics>(`/api/v1/admin/analytics/operational${q}`).catch(() => ({})),
      api.get<StoreRow[] | { data?: StoreRow[] }>("/api/v1/admin/stores/performance").catch(() => []),
      api.get<Array<Record<string, unknown>> | { data?: Array<Record<string, unknown>> }>(
        "/api/v1/admin/darkstores?limit=20",
      ).catch(() => []),
    ]);

    const metrics = metricsRes && typeof metricsRes === "object" ? metricsRes : emptyMetrics;
    const hourlyRaw = Array.isArray(hourlyRes)
      ? hourlyRes
      : Array.isArray((hourlyRes as { data?: HourPoint[] })?.data)
        ? (hourlyRes as { data: HourPoint[] }).data
        : [];
    const ops = (opsRes && typeof opsRes === "object" ? opsRes : {}) as OperationalMetrics;
    let storeRaw = Array.isArray(storesRes)
      ? storesRes
      : Array.isArray((storesRes as { data?: StoreRow[] })?.data)
        ? (storesRes as { data: StoreRow[] }).data
        : [];

    if (!storeRaw.length) {
      const ds = Array.isArray(darkstoresRes)
        ? darkstoresRes
        : Array.isArray((darkstoresRes as { data?: Array<Record<string, unknown>> })?.data)
          ? (darkstoresRes as { data: Array<Record<string, unknown>> }).data
          : [];
      storeRaw = ds.map((d) => ({
        name: String(d.name ?? d.storeName ?? d.code ?? "Dark store"),
        city: String(d.city ?? d.location ?? "—"),
        orders: Number(d.ordersToday ?? d.orderCount ?? 0),
        pickRate: Number(d.pickRate ?? 0),
        packRate: Number(d.packRate ?? 0),
        sla: d.sla ?? "—",
        status: String(d.status ?? "Active"),
      }));
    }

    return transform(metrics as RealtimeMetrics, toHourly(hourlyRaw), toAlerts(ops), toStoreRows(storeRaw), ops);
  },
};
