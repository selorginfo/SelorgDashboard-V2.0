import { useMemo, useState } from "react";
import { Download, RefreshCw } from "lucide-react";
import {
  useRealtime,
  useOperational,
  useCustomerMetrics,
  useFinancial,
  useRevenueBreakdown,
  useCategories,
  usePaymentMethods,
  useProducts,
  useRegional,
  useGrowth,
  usePickerAnalytics,
  formatRupees,
  formatPct,
  type ReportKind,
} from "@/modules/analytics/hooks/useAnalytics";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import type { KpiStat } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import styles from "./AnalyticsReportPage.module.css";

type Props = {
  kind: ReportKind;
  moduleId: ModuleId;
  title: string;
};

const TABS: Record<ReportKind, string[]> = {
  overall: ["Business summary", "By dark store", "Month to date", "Variance"],
  sales: ["Revenue", "By category", "Payment mix", "Top products", "Discounts"],
  ops: ["By store", "Exceptions", "Scanner", "Pick & pack", "Delivery"],
  people: ["On shift", "Pickers", "Riders", "Attendance", "Earnings"],
  customer: ["Summary", "New vs returning", "Top spenders", "Churn", "Segments"],
};

export function AnalyticsReportView({ kind, moduleId, title }: Props) {
  const tabs = TABS[kind];
  const [tab, setTab] = useState(tabs[0] ?? "Summary");
  const pushToast = useUiStore((s) => s.pushToast);

  const realtime = useRealtime("24h");
  const operational = useOperational("24h");
  const customers = useCustomerMetrics("30d");
  const financial = useFinancial("24h");
  const revenue = useRevenueBreakdown("24h");
  const categories = useCategories("24h");
  const payments = usePaymentMethods("24h");
  const products = useProducts("24h");
  const regional = useRegional("24h");
  const growth = useGrowth("30d");
  const pickers = usePickerAnalytics();

  const loading =
    realtime.isLoading ||
    (kind === "ops" && operational.isLoading) ||
    (kind === "customer" && customers.isLoading) ||
    (kind === "sales" && financial.isLoading) ||
    (kind === "people" && pickers.isLoading) ||
    (kind === "overall" && operational.isLoading);

  const errored =
    realtime.isError &&
    operational.isError &&
    customers.isError &&
    financial.isError &&
    pickers.isError;

  const liveKpis: KpiStat[] = useMemo(() => {
    const m = realtime.data;
    const ops = operational.data;
    const cus = customers.data;
    const fin = financial.data;
    const pk = pickers.data;

    if (kind === "overall") {
      return [
        { value: formatRupees(m?.totalRevenue ?? 0), label: "Revenue" },
        { value: String(m?.totalOrders ?? 0), label: "Orders" },
        { value: formatRupees(m?.averageOrderValue ?? 0), label: "Avg order value" },
        { value: formatPct(ops?.onTimeDeliveryRate), label: "SLA on-time" },
        { value: formatPct(ops?.refundRate), label: "Refund rate" },
        { value: String(m?.activeUsers ?? 0), label: "Active customers" },
      ];
    }
    if (kind === "sales") {
      return [
        { value: formatRupees(m?.totalRevenue ?? fin?.totalRevenue ?? 0), label: "Revenue" },
        { value: formatRupees(fin?.totalDiscount ?? 0), label: "Discounts" },
        { value: formatRupees(fin?.totalDeliveryFee ?? 0), label: "Delivery fees" },
        { value: formatRupees(m?.averageOrderValue ?? fin?.averageOrderValue ?? 0), label: "Avg order value" },
        { value: String(m?.totalOrders ?? fin?.totalOrders ?? 0), label: "Orders" },
        { value: formatPct(m?.revenueGrowth), label: "Revenue growth" },
      ];
    }
    if (kind === "ops") {
      return [
        { value: String(m?.totalOrders ?? 0), label: "Orders" },
        { value: formatPct(ops?.onTimeDeliveryRate), label: "On-time delivery" },
        { value: formatPct(ops?.orderFulfillmentRate), label: "Fulfillment" },
        { value: formatPct(ops?.cancellationRate), label: "Cancellation rate" },
        { value: formatPct(ops?.refundRate), label: "Refund rate" },
        {
          value: ops?.averageDeliveryTime != null ? `${ops.averageDeliveryTime} min` : "—",
          label: "Avg delivery time",
        },
      ];
    }
    if (kind === "people") {
      const byRole = pk?.byRole ?? {};
      return [
        { value: String(pk?.total ?? 0), label: "Staff" },
        { value: String(pk?.punchedIn ?? 0), label: "On shift" },
        { value: String(byRole.picker ?? byRole.Picker ?? 0), label: "Pickers" },
        { value: String(byRole.rider ?? byRole.Rider ?? 0), label: "Riders" },
        { value: String(Object.keys(pk?.byStatus ?? {}).length), label: "Status buckets" },
        { value: String(m?.totalOrders ?? 0), label: "Orders in range" },
      ];
    }
    return [
      { value: String(cus?.totalCustomers ?? 0), label: "Total customers" },
      { value: String(cus?.newCustomers ?? 0), label: "New customers" },
      { value: String(cus?.returningCustomers ?? 0), label: "Returning" },
      { value: formatPct(cus?.customerRetentionRate), label: "Retention" },
      { value: formatRupees(cus?.averageLifetimeValue ?? 0), label: "Avg LTV" },
      { value: formatPct(cus?.churnRate), label: "Churn rate" },
    ];
  }, [kind, realtime.data, operational.data, customers.data, financial.data, pickers.data]);

  const table = useMemo(() => {
    const m = realtime.data;
    const ops = operational.data;
    const cus = customers.data;
    const fin = financial.data;
    const pk = pickers.data;

    if (kind === "overall") {
      if (tab === "By dark store") {
        return {
          columns: ["Region / store", "Orders", "Revenue", "Active users"],
          rows: (regional.data ?? []).map((r) => [
            String(r.region ?? r.city ?? r.name ?? "—"),
            String(r.orders ?? 0),
            formatRupees(Number(r.revenue ?? 0)),
            String(r.activeUsers ?? "—"),
          ]),
        };
      }
      if (tab === "Month to date") {
        return {
          columns: ["Period", "Revenue", "Orders", "Rev growth", "Orders growth"],
          rows: (growth.data ?? []).map((r) => [
            String(r.period ?? r.label ?? "—"),
            formatRupees(Number(r.revenue ?? 0)),
            String(r.orders ?? 0),
            formatPct(Number(r.revenueGrowth ?? 0)),
            formatPct(Number(r.ordersGrowth ?? 0)),
          ]),
        };
      }
      if (tab === "Variance") {
        return {
          columns: ["Metric", "Value", "Source"],
          rows: [
            ["SLA on-time", formatPct(ops?.onTimeDeliveryRate), "Live"],
            ["Cancellation rate", formatPct(ops?.cancellationRate), "Live"],
            ["Refund rate", formatPct(ops?.refundRate), "Live"],
            ["Fulfillment", formatPct(ops?.orderFulfillmentRate), "Live"],
            ["Revenue growth", formatPct(m?.revenueGrowth), "Live"],
          ],
        };
      }
      return {
        columns: ["Metric", "Value"],
        rows: [
          ["Revenue", formatRupees(m?.totalRevenue ?? 0)],
          ["Orders", String(m?.totalOrders ?? 0)],
          ["Avg order value", formatRupees(m?.averageOrderValue ?? 0)],
          ["Active customers", String(m?.activeUsers ?? 0)],
          ["Conversion", formatPct(m?.conversionRate)],
          ["Orders growth", formatPct(m?.ordersGrowth)],
        ],
      };
    }

    if (kind === "sales") {
      if (tab === "By category") {
        const rows = (categories.data?.length ? categories.data : revenue.data) ?? [];
        return {
          columns: ["Category", "Orders", "Revenue", "Share"],
          rows: rows.map((r) => [
            String(r.category ?? r.label ?? r.name ?? "—"),
            String(r.orders ?? "—"),
            formatRupees(Number(r.revenue ?? r.value ?? r.totalRevenue ?? 0)),
            formatPct(Number(r.percentage ?? r.percentageOfTotal ?? 0)),
          ]),
        };
      }
      if (tab === "Payment mix") {
        return {
          columns: ["Method", "Transactions", "Revenue", "Share"],
          rows: (payments.data ?? []).map((r) => [
            String(r.method ?? r.label ?? r.name ?? "—"),
            String(r.transactions ?? r.count ?? "—"),
            formatRupees(Number(r.revenue ?? r.value ?? 0)),
            formatPct(Number(r.percentage ?? 0)),
          ]),
        };
      }
      if (tab === "Top products") {
        return {
          columns: ["Product", "SKU", "Units", "Revenue"],
          rows: (products.data ?? []).map((r) => [
            String(r.name ?? r.productName ?? "—"),
            String(r.sku ?? "—"),
            String(r.unitsSold ?? r.units ?? r.quantity ?? "—"),
            formatRupees(Number(r.totalRevenue ?? r.revenue ?? 0)),
          ]),
        };
      }
      if (tab === "Discounts") {
        return {
          columns: ["Metric", "Value"],
          rows: [
            ["Total discount", formatRupees(fin?.totalDiscount ?? 0)],
            ["Delivery fees", formatRupees(fin?.totalDeliveryFee ?? 0)],
            ["Revenue", formatRupees(fin?.totalRevenue ?? m?.totalRevenue ?? 0)],
          ],
        };
      }
      return {
        columns: ["Metric", "Value"],
        rows: [
          ["Revenue", formatRupees(m?.totalRevenue ?? fin?.totalRevenue ?? 0)],
          ["Orders", String(m?.totalOrders ?? fin?.totalOrders ?? 0)],
          ["AOV", formatRupees(m?.averageOrderValue ?? fin?.averageOrderValue ?? 0)],
          ["Discount", formatRupees(fin?.totalDiscount ?? 0)],
        ],
      };
    }

    if (kind === "ops") {
      if (tab === "By store") {
        return {
          columns: ["Store / region", "Orders", "Revenue"],
          rows: (regional.data ?? []).map((r) => [
            String(r.region ?? r.city ?? r.name ?? "—"),
            String(r.orders ?? 0),
            formatRupees(Number(r.revenue ?? 0)),
          ]),
        };
      }
      if (tab === "Exceptions") {
        return {
          columns: ["Metric", "Value"],
          rows: [
            ["Cancellation rate", formatPct(ops?.cancellationRate)],
            ["Refund rate", formatPct(ops?.refundRate)],
          ],
        };
      }
      if (tab === "Scanner") {
        return {
          columns: ["Metric", "Value"],
          rows: [["Scanner aggregate", "Use Monitoring → Scanner Operations for device live data"]],
        };
      }
      if (tab === "Pick & pack") {
        return {
          columns: ["Metric", "Value"],
          rows: [
            ["Fulfillment rate", formatPct(ops?.orderFulfillmentRate)],
            ["Avg delivery time", ops?.averageDeliveryTime != null ? `${ops.averageDeliveryTime} min` : "—"],
          ],
        };
      }
      return {
        columns: ["Metric", "Value"],
        rows: [
          ["On-time delivery", formatPct(ops?.onTimeDeliveryRate)],
          ["Avg rating", ops?.averageRating != null ? String(ops.averageRating) : "—"],
        ],
      };
    }

    if (kind === "people") {
      const statusRows = Object.entries(pk?.byStatus ?? {}).map(([k, v]) => [k, String(v)]);
      const roleRows = Object.entries(pk?.byRole ?? {}).map(([k, v]) => [k, String(v)]);
      if (tab === "Attendance") {
        return {
          columns: ["Status", "Count"],
          rows: statusRows.length ? statusRows : [["No attendance buckets", "0"]],
        };
      }
      if (tab === "Earnings") {
        return {
          columns: ["Metric", "Value"],
          rows: [
            ["Staff total", String(pk?.total ?? 0)],
            ["Earnings detail", "See Workforce → Earnings for payouts"],
          ],
        };
      }
      return {
        columns: ["Segment", "Count"],
        rows:
          tab === "On shift"
            ? [
                ["Punched in", String(pk?.punchedIn ?? 0)],
                ["Total staff", String(pk?.total ?? 0)],
                ...statusRows,
              ]
            : roleRows.length
              ? roleRows
              : [["Total", String(pk?.total ?? 0)]],
      };
    }

    if (tab === "New vs returning") {
      return {
        columns: ["Segment", "Count"],
        rows: [
          ["New", String(cus?.newCustomers ?? 0)],
          ["Returning", String(cus?.returningCustomers ?? 0)],
          ["Retention", formatPct(cus?.customerRetentionRate)],
        ],
      };
    }
    if (tab === "Churn") {
      return {
        columns: ["Metric", "Value"],
        rows: [
          ["Churn rate", formatPct(cus?.churnRate)],
          ["Acquisition cost", formatRupees(cus?.customerAcquisitionCost ?? 0)],
        ],
      };
    }
    if (tab === "Top spenders" || tab === "Segments") {
      return {
        columns: ["Metric", "Value"],
        rows: [
          ["Total customers", String(cus?.totalCustomers ?? 0)],
          ["Avg LTV", formatRupees(cus?.averageLifetimeValue ?? 0)],
          ["Detail", "Named spenders available in Customers module"],
        ],
      };
    }
    return {
      columns: ["Metric", "Value"],
      rows: [
        ["Total customers", String(cus?.totalCustomers ?? 0)],
        ["New customers", String(cus?.newCustomers ?? 0)],
        ["Returning", String(cus?.returningCustomers ?? 0)],
        ["Retention", formatPct(cus?.customerRetentionRate)],
        ["Avg LTV", formatRupees(cus?.averageLifetimeValue ?? 0)],
        ["Churn", formatPct(cus?.churnRate)],
      ],
    };
  }, [
    kind,
    tab,
    realtime.data,
    operational.data,
    customers.data,
    financial.data,
    regional.data,
    growth.data,
    categories.data,
    revenue.data,
    payments.data,
    products.data,
    pickers.data,
  ]);

  function exportCsv() {
    const lines = [table.columns.join(",")].concat(
      table.rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${kind}-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast(`${title} exported`, "success");
  }

  function refresh() {
    void realtime.refetch();
    void operational.refetch();
    void customers.refetch();
    void financial.refetch();
    void regional.refetch();
    void growth.refetch();
    void categories.refetch();
    void revenue.refetch();
    void payments.refetch();
    void products.refetch();
    void pickers.refetch();
    pushToast("Analytics refreshed", "info");
  }

  if (loading) return <CardSkeleton />;
  if (errored) {
    return <ErrorState message={`Couldn't load ${title}.`} onRetry={refresh} />;
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId={moduleId} />

      <KpiStrip kpis={liveKpis} moduleId={moduleId} />

      <div className={styles.toolbar}>
        <Button size="sm" onClick={refresh}>
          <RefreshCw size={12} /> Refresh
        </Button>
        <Button size="sm" variant="primary" onClick={exportCsv}>
          <Download size={12} /> Export
        </Button>
      </div>

      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {table.rows.length === 0 ? (
        <EmptyState title={`No live ${tab.toLowerCase()} data for this range`} />
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {table.columns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i}>
                    {r.map((c, j) => (
                      <td key={j}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export function OverallReportPage() {
  return <AnalyticsReportView kind="overall" moduleId="rpt-overall" title="Overall Report" />;
}
export function SalesReportPage() {
  return <AnalyticsReportView kind="sales" moduleId="rpt-sales" title="Sales Report" />;
}
export function OperationsReportPage() {
  return <AnalyticsReportView kind="ops" moduleId="rpt-ops" title="Operations Report" />;
}
export function EmployeeReportPage() {
  return <AnalyticsReportView kind="people" moduleId="rpt-people" title="Employee Report" />;
}
export function CustomerReportPage() {
  return <AnalyticsReportView kind="customer" moduleId="rpt-customer" title="Customer Report" />;
}
