import { useMemo, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { usePayouts, useApprovePayoutRun } from "@/modules/workforce/hooks/usePayouts";
import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import styles from "./PayoutsPage.module.css";

const CONFIG = WORKFORCE_CONFIGS.payouts;

export function PayoutsPage() {
  const { data: runs, isLoading, isError, refetch } = usePayouts();
  const approveRun = useApprovePayoutRun();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState(CONFIG?.tabs[0] ?? "Current run");
  const [approvingId, setApprovingId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => (runs ?? []).filter((r) => r.tab === tab), [runs, tab]);
  const currentRun = useMemo(() => (runs ?? []).filter((r) => r.tab === "Current run"), [runs]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !runs) return <ErrorState message="Couldn't load payout runs." onRetry={() => refetch()} />;

  const canApprove = can("payouts", "approve");
  const pendingCurrent = currentRun.filter((r) => r.status.label === "Awaiting approval");

  function approve(id: string) {
    setApprovingId(id);
    approveRun.mutate(id, {
      onSuccess: () => {
        pushToast("Payout run approved", "success");
        setApprovingId(undefined);
      },
      onError: () => setApprovingId(undefined),
    });
  }

  function releaseRun() {
    for (const row of pendingCurrent) approve(row.id);
  }

  return (
    <div className={styles.wrap}>
      {CONFIG ? <KpiStrip kpis={CONFIG.kpis} moduleId="payouts" /> : null}

      {CONFIG && CONFIG.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} />
        </Card>
      ) : null}

      {canApprove && pendingCurrent.length > 0 ? (
        <Card className={styles.releaseCard}>
          <div>
            <div className={styles.releaseTitle}>This week's run is awaiting approval</div>
            <div className={styles.releaseMeta}>
              {pendingCurrent.length} workforce {pendingCurrent.length === 1 ? "line" : "lines"} ready to release
            </div>
          </div>
          <Button variant="primary" size="sm" isLoading={approveRun.isPending} onClick={releaseRun}>
            <Send size={13} /> Release run
          </Button>
        </Card>
      ) : null}

      <div className={styles.tabs}>
        {(CONFIG?.tabs ?? []).map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`Nothing in "${tab}"`} />
      ) : (
        <div className={styles.list}>
          {filtered.map((run) => (
            <Card key={run.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.refLine}>
                  <span className={styles.ref}>{run.run}</span>
                  <Badge label={run.status.label} tone={run.status.tone} />
                </div>
                <div className={styles.metaLine}>
                  {run.workforce} · {run.cycle} · {run.people} {Number(run.people) === 1 ? "person" : "people"}
                </div>
              </div>

              <div className={styles.metricsGrid}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{run.gross}</span>
                  <span className={styles.metricLabel}>Gross</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>{run.deductions}</span>
                  <span className={styles.metricLabel}>Deductions</span>
                </div>
                <div className={styles.metric} data-emphasis="true">
                  <span className={styles.metricValue}>{run.net}</span>
                  <span className={styles.metricLabel}>Net</span>
                </div>
              </div>

              {canApprove && run.tab === "Current run" && run.status.label === "Awaiting approval" ? (
                <div className={styles.actionsRow}>
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={approveRun.isPending && approvingId === run.id}
                    onClick={() => approve(run.id)}
                  >
                    <CheckCircle2 size={13} /> Approve
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
