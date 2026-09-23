import { useMemo, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { useRoster, useApproveSwap, useFillGap } from "@/modules/workforce/hooks/useRoster";
import { WORKFORCE_CONFIGS } from "@/services/workspace/data/workforce";
import { api } from "@/lib/apiClient";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { RosterEntry } from "@/types/workforce";
import type { KpiStat } from "@/types/common";
import styles from "./RosterPage.module.css";

const CONFIG = WORKFORCE_CONFIGS.roster;
const DEFAULT_TABS = ["Today", "Tomorrow", "This week", "Unfilled", "Swap requests"];

function entriesForTab(entries: RosterEntry[], tab: string): RosterEntry[] {
  if (tab === "Unfilled") {
    return entries.filter((e) => (e.tab === "Today" || e.tab === "Tomorrow") && e.status.label === "Understaffed");
  }
  return entries.filter((e) => e.tab === tab);
}

export function RosterPage() {
  const { data: entries, isLoading, isError, refetch } = useRoster();
  const approveSwap = useApproveSwap();
  const fillGap = useFillGap();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const tabs = CONFIG?.tabs?.length ? CONFIG.tabs : DEFAULT_TABS;
  const [tab, setTab] = useState(tabs[0] ?? "Today");
  const [approvingId, setApprovingId] = useState<string | undefined>(undefined);
  const [fillingId, setFillingId] = useState<string | undefined>(undefined);
  const [busyId, setBusyId] = useState<string | undefined>(undefined);
  const [detail, setDetail] = useState<string | undefined>(undefined);

  const filtered = useMemo(() => entriesForTab(entries ?? [], tab), [entries, tab]);

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = entries ?? [];
    const unfilled = list.filter((e) => e.gap !== "0" || e.status?.label === "Understaffed").length;
    const swaps = list.filter((e) => e.tab === "Swap requests" || e.status?.label === "Awaiting approval").length;
    const confirmed = list.reduce((n, e) => n + Number(e.confirmed || 0), 0);
    const target = list.reduce((n, e) => n + Number(e.target || 0), 0);
    const fillPct = target > 0 ? `${Math.round((confirmed / target) * 100)}%` : "—";
    return [
      { value: String(list.length), label: "Rostered" },
      { value: String(unfilled), label: "Unfilled", color: unfilled ? "var(--amber-tx)" : undefined },
      { value: fillPct, label: "Fill rate" },
      { value: String(swaps), label: "Swap requests" },
      { value: String(confirmed), label: "Confirmed" },
      { value: String(target), label: "Target headcount" },
    ];
  }, [entries]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !entries) return <ErrorState message="Couldn't load the roster." onRetry={() => refetch()} />;

  const canApprove = can("roster", "approve");
  const canAssign = can("roster", "assign");

  function handleApprove(id: string) {
    setApprovingId(id);
    approveSwap.mutate(id, {
      onSuccess: () => {
        pushToast("Swap request approved", "success");
        setApprovingId(undefined);
      },
      onError: () => setApprovingId(undefined),
    });
  }

  function handleFillGap(entry: RosterEntry) {
    setFillingId(entry.id);
    fillGap.mutate(entry.id, {
      onSuccess: () => {
        pushToast(`${entry.shift} · gap reduced`, "success");
        setFillingId(undefined);
      },
      onError: () => setFillingId(undefined),
    });
  }

  async function handleRemind(entry: RosterEntry) {
    setBusyId(entry.id);
    try {
      await api.post(`/api/v1/rider/hr/riders/${encodeURIComponent(entry.id)}/remind`);
      pushToast(`Reminder sent for ${entry.shift}`, "success");
    } catch (err) {
      pushToast((err as Error).message || "Couldn't send reminder", "error");
    } finally {
      setBusyId(undefined);
    }
  }

  async function handleOpen(entry: RosterEntry) {
    setBusyId(entry.id);
    try {
      const res = await api.get<unknown>(`/api/v1/warehouse/staff/shifts/${encodeURIComponent(entry.id)}`);
      setDetail(JSON.stringify(res, null, 2));
    } catch {
      try {
        const res = await api.get<unknown>(`/api/v1/rider/shifts/${encodeURIComponent(entry.id)}`);
        setDetail(JSON.stringify(res, null, 2));
      } catch (err) {
        pushToast((err as Error).message || "Couldn't load shift detail", "error");
      }
    } finally {
      setBusyId(undefined);
    }
  }

  const awaiting = (entries ?? []).find((e) => e.status?.label === "Awaiting approval");
  const gapped = (entries ?? []).find((e) => e.gap !== "0") ?? filtered[0];

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={liveKpis} moduleId="roster" />

      {CONFIG && CONFIG.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} />
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
        <Button
          size="sm"
          variant="primary"
          disabled={!canAssign || !gapped}
          onClick={() => gapped && handleFillGap(gapped)}
        >
          Assign
        </Button>
        <Button size="sm" disabled={!canAssign || !gapped} onClick={() => gapped && handleFillGap(gapped)}>
          Fill gap
        </Button>
        <Button
          size="sm"
          disabled={!canApprove || !awaiting}
          isLoading={approveSwap.isPending}
          onClick={() => awaiting && handleApprove(awaiting.id)}
        >
          <CheckCircle2 size={13} /> Approve
        </Button>
        <Button size="sm" disabled={!filtered[0]} onClick={() => filtered[0] && void handleRemind(filtered[0]!)}>
          Remind
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
      ) : tab === "Swap requests" ? (
        <div className={styles.list}>
          {filtered.map((entry) => (
            <Card key={entry.id} className={styles.swapRow}>
              <div className={styles.rowMain}>
                <div className={styles.shiftName}>{entry.shift}</div>
                <div className={styles.metaLine}>{entry.location}</div>
                <div className={styles.metaLine}>Starts {entry.starts}</div>
              </div>
              <Badge label={entry.status?.label ?? "—"} tone={entry.status?.tone ?? "grey"} />
              {canApprove && entry.status?.label === "Awaiting approval" ? (
                <Button
                  size="sm"
                  variant="primary"
                  isLoading={approveSwap.isPending && approvingId === entry.id}
                  onClick={() => handleApprove(entry.id)}
                >
                  <CheckCircle2 size={13} /> Approve
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((entry) => (
            <Card
              key={entry.id}
              className={styles.card}
              data-flag={entry.status?.tone === "red" ? "red" : entry.status?.tone === "amber" ? "amber" : undefined}
            >
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.shiftName}>{entry.shift}</div>
                  <div className={styles.metaLine}>{entry.location}</div>
                </div>
                <Badge label={entry.status?.label ?? "—"} tone={entry.status?.tone ?? "grey"} />
              </div>

              <div className={styles.staffGrid}>
                <div className={styles.staffCell}>
                  <span className={styles.staffValue}>{entry.assigned}</span>
                  <span className={styles.staffLabel}>Assigned</span>
                </div>
                <div className={styles.staffCell}>
                  <span className={styles.staffValue}>{entry.target}</span>
                  <span className={styles.staffLabel}>Target</span>
                </div>
                <div className={styles.staffCell}>
                  <span className={styles.staffValue}>{entry.confirmed}</span>
                  <span className={styles.staffLabel}>Confirmed</span>
                </div>
                <div className={styles.staffCell}>
                  <span className={styles.staffValue} data-tone={entry.gap !== "0" ? "amber" : undefined}>
                    {entry.gap}
                  </span>
                  <span className={styles.staffLabel}>Gap</span>
                </div>
              </div>

              <div className={styles.barRow}>
                <div className={styles.dualBar}>
                  <div
                    className={styles.dualBarAssigned}
                    style={{
                      width: `${Math.min(100, Math.round((Number(entry.assigned) / Math.max(1, Number(entry.target))) * 100))}%`,
                    }}
                  />
                  <div
                    className={styles.dualBarConfirmed}
                    style={{
                      width: `${Math.min(100, Math.round((Number(entry.confirmed) / Math.max(1, Number(entry.target))) * 100))}%`,
                    }}
                  />
                </div>
                <span className={styles.gapText}>{entry.gap !== "0" ? `${entry.gap} short` : "Fully staffed"}</span>
              </div>

              <div className={styles.cardBottom}>
                <div className={styles.metaLine}>Starts {entry.starts}</div>
                <div className={styles.cardActions}>
                  {canAssign && entry.gap !== "0" ? (
                    <Button
                      size="sm"
                      variant="primary"
                      isLoading={fillGap.isPending && fillingId === entry.id}
                      onClick={() => handleFillGap(entry)}
                    >
                      Fill gap
                    </Button>
                  ) : null}
                  <Button size="sm" isLoading={busyId === entry.id} onClick={() => void handleRemind(entry)}>
                    Remind
                  </Button>
                  <Button size="sm" isLoading={busyId === entry.id} onClick={() => void handleOpen(entry)}>
                    Open
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!detail} onOpenChange={(open) => !open && setDetail(undefined)} title="Roster / shift detail">
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, margin: 0, maxHeight: 360, overflow: "auto" }}>{detail}</pre>
      </Dialog>
    </div>
  );
}
