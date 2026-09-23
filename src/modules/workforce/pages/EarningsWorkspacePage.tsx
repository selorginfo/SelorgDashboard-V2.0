import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useEarnings, useApproveEarning } from "@/modules/workforce/hooks/useEarnings";
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
import type { WorkerKind } from "@/types/workforce";
import type { KpiStat } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import styles from "./EarningsWorkspacePage.module.css";

const MODULE_BY_KIND: Record<WorkerKind, ModuleId> = { rider: "rider-earn", picker: "picker-earn" };
const PERSON_LABEL: Record<WorkerKind, string> = { rider: "Rider", picker: "Picker" };
const DEFAULT_TABS = ["This week", "Payout run", "Pending approval", "Paid", "Adjustments", "On hold"];

function parseMoney(v: string): number {
  const n = Number(String(v).replace(/[₹,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function EarningsWorkspacePage({ kind }: { kind: WorkerKind }) {
  const moduleId = MODULE_BY_KIND[kind];
  const config = WORKFORCE_CONFIGS[moduleId];
  const { data: earnings, isLoading, isError, refetch } = useEarnings(kind);
  const approve = useApproveEarning(kind);
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const tabs = config?.tabs?.length ? config.tabs : DEFAULT_TABS;
  const [tab, setTab] = useState(tabs[0] ?? "This week");
  const [approvingId, setApprovingId] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => (earnings ?? []).filter((e) => e.tab === tab), [earnings, tab]);

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = earnings ?? [];
    const totalNet = list.reduce((sum, e) => sum + parseMoney(e.net), 0);
    const pending = list.filter((e) => e.status?.label === "Pending").length;
    const hold = list.filter((e) => /hold|dispute/i.test(e.status?.label ?? "")).length;
    const people = new Set(list.map((e) => e.person)).size;
    return [
      { value: `₹${Math.round(totalNet).toLocaleString("en-IN")}`, label: "Payout total" },
      { value: String(people), label: kind === "rider" ? "Riders in run" : "Pickers in run" },
      { value: String(list.length), label: "Ledger rows" },
      { value: String(pending), label: "Pending", color: pending ? "var(--amber-tx)" : undefined },
      { value: String(hold), label: "On hold", color: hold ? "var(--red-tx)" : undefined },
      { value: String(list.filter((e) => /settled|paid|approved/i.test(e.status?.label ?? "")).length), label: "Settled" },
    ];
  }, [earnings, kind]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !earnings) return <ErrorState message="Couldn't load earnings." onRetry={() => refetch()} />;

  const canApprove = can(moduleId, "approve");

  function handleApprove(id: string) {
    setApprovingId(id);
    approve.mutate(id, {
      onSuccess: () => {
        pushToast("Earning approved", "success");
        setApprovingId(undefined);
      },
      onError: () => setApprovingId(undefined),
    });
  }

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={liveKpis} moduleId={moduleId} />

      {config && config.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={config.flow} activeIndex={config.flowAt} />
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!canApprove || !filtered.some((e) => e.status?.label === "Pending")}
          onClick={() => {
            const first = filtered.find((e) => e.status?.label === "Pending");
            if (first) handleApprove(first.id);
          }}
        >
          <CheckCircle2 size={13} /> Approve
        </Button>
      </div>

      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`Nothing in "${tab}"`} />
      ) : (
        <div className={styles.list}>
          {filtered.map((earning) => (
            <Card key={earning.id} className={styles.row}>
              <div className={styles.rowMain}>
                <div className={styles.refLine}>
                  <span className={styles.ref}>{earning.ref}</span>
                  <Badge label={earning.status?.label ?? "—"} tone={earning.status?.tone ?? "grey"} />
                </div>
                <div className={styles.personLine}>
                  {PERSON_LABEL[kind]}: {earning.person}
                </div>
              </div>

              <div className={styles.metricsGrid}>
                {(earning.metrics ?? []).map((m, i) => (
                  <div key={`${m.label}-${i}`} className={styles.metric}>
                    <span className={styles.metricValue}>{m.value}</span>
                    <span className={styles.metricLabel}>{m.label}</span>
                  </div>
                ))}
                <div className={styles.metric} data-emphasis="true">
                  <span className={styles.metricValue}>{earning.net}</span>
                  <span className={styles.metricLabel}>Net</span>
                </div>
              </div>

              {canApprove && earning.status?.label === "Pending" ? (
                <div className={styles.actionsRow}>
                  <Button
                    size="sm"
                    variant="primary"
                    isLoading={approve.isPending && approvingId === earning.id}
                    onClick={() => handleApprove(earning.id)}
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
