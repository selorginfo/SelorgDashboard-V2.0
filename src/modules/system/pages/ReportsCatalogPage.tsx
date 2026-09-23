import { useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  useRealtime,
  useOperational,
  useFinancial,
  useInventoryHealth,
  useAnalyticsExport,
  formatRupees,
  formatPct,
} from "@/modules/analytics/hooks/useAnalytics";
import { REPORTS_CONFIGS } from "@/services/workspace/data/reports";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import { api } from "@/lib/apiClient";
import type { ReportCatalogItem } from "@/types/system";
import type { KpiStat } from "@/types/common";
import styles from "./ReportsCatalogPage.module.css";

const CONFIG = REPORTS_CONFIGS.reports;
const TABS = (CONFIG?.tabs ?? [
  "Operations",
  "Supply chain",
  "Sales",
  "Inventory",
  "Rider",
  "Finance",
]) as ReportCatalogItem["tab"][];

function trendTone(change: string): "green" | "red" | "grey" {
  if (change.startsWith("+")) return "green";
  if (change.startsWith("−") || change.startsWith("-")) return "red";
  return "grey";
}

function pctChange(n: number | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v) || v === 0) return "—";
  const sign = v > 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}%`;
}

export function ReportsCatalogPage() {
  const [tab, setTab] = useState<ReportCatalogItem["tab"]>(TABS[0] ?? "Operations");
  const [generating, setGenerating] = useState<string | null>(null);
  const pushToast = useUiStore((s) => s.pushToast);

  const realtime = useRealtime("24h");
  const operational = useOperational("24h");
  const financial = useFinancial("24h");
  const inventory = useInventoryHealth();
  const catalogExport = useAnalyticsExport("30d");

  const loading = realtime.isLoading || operational.isLoading || financial.isLoading;
  const errored = realtime.isError && operational.isError && financial.isError;

  const liveKpis: KpiStat[] = useMemo(() => {
    const m = realtime.data;
    const ops = operational.data;
    return [
      { value: String(m?.totalOrders ?? 0), label: "Orders" },
      { value: formatRupees(m?.averageOrderValue ?? 0), label: "Avg order value" },
      { value: formatPct(ops?.onTimeDeliveryRate), label: "SLA on-time" },
      {
        value: ops?.averageDeliveryTime != null ? `${ops.averageDeliveryTime} min` : "—",
        label: "Avg delivery",
      },
      { value: formatPct(ops?.refundRate), label: "Refund rate" },
      { value: formatRupees(m?.totalRevenue ?? 0), label: "Revenue" },
    ];
  }, [realtime.data, operational.data]);

  const catalog: ReportCatalogItem[] = useMemo(() => {
    const m = realtime.data;
    const ops = operational.data;
    const fin = financial.data;
    const inv = inventory.data;
    const stockouts =
      inv && typeof inv === "object" && !Array.isArray(inv)
        ? Number((inv as Record<string, unknown>).stockoutSkus ?? (inv as Record<string, unknown>).stockouts ?? 0)
        : Array.isArray(inv)
          ? inv.length
          : 0;

    const ready = { label: "Ready", tone: "green" as const };
    return [
      {
        id: "live-order-throughput",
        name: "Order throughput",
        scope: "All stores",
        period: "Live 24h",
        metric: `${m?.totalOrders ?? 0} orders`,
        change: pctChange(m?.ordersGrowth),
        owner: "Ops",
        format: "CSV / PDF",
        status: ready,
        tab: "Operations",
      },
      {
        id: "live-sla",
        name: "SLA performance",
        scope: "All stores",
        period: "Live 24h",
        metric: formatPct(ops?.onTimeDeliveryRate),
        change: "—",
        owner: "Ops",
        format: "CSV",
        status: ready,
        tab: "Operations",
      },
      {
        id: "live-fulfillment",
        name: "Fulfillment & delivery time",
        scope: "All stores",
        period: "Live 24h",
        metric: `${formatPct(ops?.orderFulfillmentRate)} / ${ops?.averageDeliveryTime ?? "—"} min`,
        change: "—",
        owner: "Ops",
        format: "CSV",
        status: ready,
        tab: "Operations",
      },
      {
        id: "live-revenue",
        name: "Revenue",
        scope: "All stores",
        period: "Live 24h",
        metric: formatRupees(m?.totalRevenue ?? 0),
        change: pctChange(m?.revenueGrowth),
        owner: "Finance",
        format: "CSV / PDF",
        status: ready,
        tab: "Sales",
      },
      {
        id: "live-aov",
        name: "Average order value",
        scope: "All stores",
        period: "Live 24h",
        metric: formatRupees(m?.averageOrderValue ?? 0),
        change: "—",
        owner: "Finance",
        format: "CSV",
        status: ready,
        tab: "Sales",
      },
      {
        id: "live-stockouts",
        name: "Inventory health",
        scope: "All stores",
        period: "Live",
        metric: `${stockouts} stockout signals`,
        change: "—",
        owner: "Warehouse",
        format: "CSV",
        status: ready,
        tab: "Inventory",
      },
      {
        id: "live-on-time",
        name: "Deliveries & on-time",
        scope: "All hubs",
        period: "Live 24h",
        metric: formatPct(ops?.onTimeDeliveryRate),
        change: "—",
        owner: "Delivery",
        format: "CSV",
        status: ready,
        tab: "Rider",
      },
      {
        id: "live-financial",
        name: "Financial summary",
        scope: "All stores",
        period: "Live 24h",
        metric: `${formatRupees(fin?.totalRevenue ?? m?.totalRevenue ?? 0)} · disc ${formatRupees(fin?.totalDiscount ?? 0)}`,
        change: "—",
        owner: "Finance",
        format: "CSV / PDF",
        status: ready,
        tab: "Finance",
      },
      {
        id: "live-refunds",
        name: "Refunds & cancellations",
        scope: "All stores",
        period: "Live 24h",
        metric: `refund ${formatPct(ops?.refundRate)} · cancel ${formatPct(ops?.cancellationRate)}`,
        change: "—",
        owner: "Finance",
        format: "CSV",
        status: ready,
        tab: "Finance",
      },
      {
        id: "live-supply",
        name: "Supply overview",
        scope: "Network",
        period: "Live",
        metric: catalogExport.data ? "Export snapshot available" : "Live analytics linked",
        change: "—",
        owner: "Warehouse",
        format: "CSV",
        status: ready,
        tab: "Supply chain",
      },
    ];
  }, [realtime.data, operational.data, financial.data, inventory.data, catalogExport.data]);

  const filtered = useMemo(() => catalog.filter((r) => r.tab === tab), [catalog, tab]);

  async function handleGenerate(report: ReportCatalogItem) {
    if (generating) return;
    setGenerating(report.id);
    try {
      await api.post("/api/v1/darkstore/reports/export", { type: report.tab, name: report.name });
      pushToast(`${report.name} — export queued`, "success");
    } catch (e) {
      pushToast((e as Error).message || `${report.name} — export unavailable`, "error");
    } finally {
      setGenerating(null);
    }
  }

  async function handleDownload(report: ReportCatalogItem) {
    try {
      const endpoint =
        report.tab === "Inventory"
          ? "/api/v1/darkstore/reports/inventory"
          : report.tab === "Staff & payroll"
            ? "/api/v1/darkstore/reports/staff"
            : report.tab === "Compliance"
              ? "/api/v1/darkstore/reports/compliance"
              : "/api/v1/darkstore/reports/export";
      const data = await api.get<unknown>(endpoint);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${report.name.replace(/[^a-z0-9]+/gi, "_").toLowerCase()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      pushToast(`${report.name} — downloaded`, "success");
    } catch (e) {
      pushToast((e as Error).message || `${report.name} — download unavailable`, "error");
    }
  }

  if (loading) return <CardSkeleton />;
  if (errored) {
    return (
      <ErrorState
        message="Couldn't load report catalog analytics."
        onRetry={() => {
          void realtime.refetch();
          void operational.refetch();
          void financial.refetch();
        }}
      />
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="reports" />

      <KpiStrip kpis={liveKpis} moduleId="reports" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`No reports in "${tab}"`} />
      ) : (
        <div className={styles.grid}>
          {filtered.map((report) => (
            <Card key={report.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.name}>{report.name}</div>
                <Badge label={report.status.label} tone={report.status.tone} />
              </div>
              <div className={styles.scope}>
                {report.scope} · {report.period}
              </div>

              <div className={styles.metricRow}>
                <span className={styles.metric}>{report.metric}</span>
                <span className={styles.change} data-tone={trendTone(report.change)}>
                  {report.change}
                </span>
              </div>

              <div className={styles.footerRow}>
                <div className={styles.formats}>
                  {report.format.split(" / ").map((f) => (
                    <span key={f} className={styles.formatTag}>
                      {f}
                    </span>
                  ))}
                </div>
                <span className={styles.owner}>{report.owner}</span>
              </div>

              <div className={styles.actionsRow}>
                <Button
                  size="sm"
                  variant="secondary"
                  isLoading={generating === report.id}
                  onClick={() => handleGenerate(report)}
                >
                  <RefreshCw size={12} /> Generate
                </Button>
                <Button size="sm" onClick={() => handleDownload(report)}>
                  <Download size={12} /> Download
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
