import { useState } from "react";
import { useDashboard } from "@/modules/dashboard/hooks/useDashboard";
import { HeroKpis } from "@/modules/dashboard/components/HeroKpis";
import { OrderFlowChart } from "@/modules/dashboard/components/OrderFlowChart";
import { LiveAlerts } from "@/modules/dashboard/components/LiveAlerts";
import { StoreOpsTable } from "@/modules/dashboard/components/StoreOpsTable";
import { SupplyDeliveryPanels } from "@/modules/dashboard/components/SupplyDeliveryPanels";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import styles from "./DashboardPage.module.css";

const RANGES = [
  { id: "24h", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
] as const;

export function DashboardPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["id"]>("24h");
  const { data, isLoading, isError, refetch } = useDashboard(range);

  if (isLoading) {
    return (
      <div className={styles.skeletonGrid}>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  if (isError || !data) {
    return <ErrorState message="Couldn't load the operations dashboard." onRetry={() => refetch()} />;
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.filterRow} role="group" aria-label="Dashboard date range">
        {RANGES.map((r) => (
          <button
            key={r.id}
            type="button"
            className={styles.filterChip}
            data-active={r.id === range}
            onClick={() => setRange(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>

      <HeroKpis kpis={data.heroKpis ?? []} />

      <KpiStrip kpis={data.opsKpis ?? []} moduleId="dashboard" />

      <div className={styles.row}>
        <OrderFlowChart hourly={data.hourly ?? []} />
        <LiveAlerts alerts={data.alerts ?? []} />
      </div>

      <div className={styles.row}>
        <StoreOpsTable rows={data.storeRows ?? []} />
        <SupplyDeliveryPanels supply={data.supply ?? []} delivery={data.delivery ?? []} />
      </div>
    </div>
  );
}
