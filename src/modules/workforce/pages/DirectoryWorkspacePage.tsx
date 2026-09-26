import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserX, UserCheck, ExternalLink } from "lucide-react";
import { useDirectory, useSetPersonStatus } from "@/modules/workforce/hooks/useDirectory";
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
import type { WorkforcePerson, WorkerKind } from "@/types/workforce";
import type { KpiStat } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import styles from "./DirectoryWorkspacePage.module.css";

const MODULE_BY_KIND: Record<WorkerKind, ModuleId> = { rider: "rider-dir", picker: "picker-dir" };
const DETAILS_PATH: Record<WorkerKind, string> = {
  rider: "/rider-details",
  picker: "/picker-details",
};
const REACTIVATE_TAB: Record<WorkerKind, string> = { rider: "Available", picker: "Available" };
const DEFAULT_TABS: Record<WorkerKind, string[]> = {
  rider: ["All riders", "Available", "On delivery", "Offline", "Suspended"],
  picker: ["All pickers", "Available", "On shift", "Offline", "Suspended"],
};

export function DirectoryWorkspacePage({ kind }: { kind: WorkerKind }) {
  const navigate = useNavigate();
  const moduleId = MODULE_BY_KIND[kind];
  const config = WORKFORCE_CONFIGS[moduleId];
  const { data: people, isLoading, isError, refetch } = useDirectory(kind);
  const setStatus = useSetPersonStatus(kind);
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const tabs = config?.tabs?.length ? config.tabs : DEFAULT_TABS[kind];
  const [tab, setTab] = useState(tabs[0] ?? "All");

  const filtered = useMemo(() => {
    if (!people) return [];
    if (tab.startsWith("All")) return people;
    return people.filter((p) => p.tab === tab);
  }, [people, tab]);

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = people ?? [];
    const suspended = list.filter((p) => p.status?.label === "Suspended").length;
    const onlineish = list.filter((p) => !["Suspended", "Offline"].includes(p.status?.label ?? "")).length;
    const onTask = list.filter((p) => ["On delivery", "On shift", "Delayed"].includes(p.status?.label ?? "")).length;
    const available = list.filter((p) => p.status?.label === "Available").length;
    const ratings = list
      .map((p) => Number(p.stats?.find((s) => s.label === "Rating")?.value))
      .filter((n) => Number.isFinite(n) && n > 0);
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
    return kind === "rider"
      ? [
          { value: String(list.length), label: "Riders" },
          { value: String(onlineish), label: "Online" },
          { value: String(onTask), label: "On delivery" },
          { value: String(available), label: "Available" },
          { value: String(suspended), label: "Suspended", color: suspended ? "var(--red-tx)" : undefined },
          { value: avg, label: "Avg rating" },
        ]
      : [
          { value: String(list.length), label: "Pickers" },
          { value: String(onTask), label: "On shift" },
          { value: String(available), label: "Available" },
          { value: String(list.filter((p) => p.status?.label === "Offline").length), label: "Offline" },
          { value: String(suspended), label: "Suspended", color: suspended ? "var(--red-tx)" : undefined },
          { value: avg, label: "Avg rating" },
        ];
  }, [people, kind]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !people) return <ErrorState message="Couldn't load the directory." onRetry={() => refetch()} />;

  const canEdit = can(moduleId, "edit");

  function openDetails(person: WorkforcePerson) {
    navigate(`${DETAILS_PATH[kind]}/${person.id}`);
  }

  function toggleSuspend(person: WorkforcePerson) {
    const suspending = person.status.label !== "Suspended";
    setStatus.mutate(
      {
        id: person.id,
        status: suspending ? { label: "Suspended", tone: "red" } : { label: "Available", tone: "green" },
        tab: suspending ? "Suspended" : REACTIVATE_TAB[kind],
      },
      {
        onSuccess: () => pushToast(`${person.name} — ${suspending ? "suspended" : "reactivated"}`, "success"),
        onError: () => pushToast("Couldn't update status", "error"),
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={liveKpis} moduleId={moduleId} />

      {config && config.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={config.flow} activeIndex={config.flowAt} />
        </Card>
      ) : null}

      <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
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
        <EmptyState title={`Nobody in "${tab}"`} />
      ) : (
        <div className={styles.grid}>
          {filtered.map((person) => (
            <Card
              key={person.id}
              className={styles.card}
              role="button"
              tabIndex={0}
              onClick={() => openDetails(person)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openDetails(person);
                }
              }}
            >
              <div className={styles.cardHeader}>
                <div>
                  <div className={styles.name}>{person.name}</div>
                  <div className={styles.locationLine}>
                    {person.locationLabel}: {person.location}
                  </div>
                </div>
                <Badge label={person.status?.label ?? "—"} tone={person.status?.tone ?? "grey"} />
              </div>

              <div className={styles.contactLine}>
                {person.contactLabel}: {person.contact}
                {person.vehicle ? ` · ${person.vehicle}` : ""}
              </div>

              <div className={styles.statsGrid}>
                {(person.stats ?? []).map((stat) => (
                  <div key={stat.label} className={styles.stat}>
                    <span className={styles.statValue}>{stat.value}</span>
                    <span className={styles.statLabel}>{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
                <Button size="sm" variant="ghost" onClick={() => openDetails(person)}>
                  <ExternalLink size={13} /> View details
                </Button>
                {canEdit ? (
                  <Button
                    size="sm"
                    variant={person.status?.label === "Suspended" ? "primary" : "danger"}
                    isLoading={setStatus.isPending}
                    onClick={() => toggleSuspend(person)}
                  >
                    {person.status?.label === "Suspended" ? (
                      <>
                        <UserCheck size={13} /> Reactivate
                      </>
                    ) : (
                      <>
                        <UserX size={13} /> Suspend
                      </>
                    )}
                  </Button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
