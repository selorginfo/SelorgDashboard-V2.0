import { useMemo, useState } from "react";
import { useAuditLog } from "@/modules/monitoring/hooks/useAuditLog";
import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import type { KpiStat } from "@/types/common";
import styles from "./AuditLogPage.module.css";

const CONFIG = SYSTEM_CONFIGS.audit;
const TABS = CONFIG?.tabs ?? ["All events", "Inventory", "Orders & refunds", "Access", "Config"];

/** Immutable audit timeline — events from live `/admin/audit/logs`. No seed fallback. */
export function AuditLogPage() {
  const [tab, setTab] = useState(TABS[0] ?? "All events");
  const { data: apiEvents, isLoading, isError, refetch } = useAuditLog(tab);
  const allEvents = apiEvents ?? [];

  const filtered = useMemo(
    () => (tab === "All events" ? allEvents : allEvents.filter((e) => e.tab === tab)),
    [tab, allEvents],
  );

  const liveKpis: KpiStat[] = useMemo(() => {
    const inventory = allEvents.filter((e) => e.tab === "Inventory" || /inventory|stock|sku/i.test(e.event)).length;
    const refunds = allEvents.filter(
      (e) => e.tab === "Orders & refunds" || /refund|order/i.test(`${e.event} ${e.module}`),
    ).length;
    const access = allEvents.filter(
      (e) => e.tab === "Access" || /permission|role|login|user/i.test(`${e.event} ${e.module}`),
    ).length;
    const transfers = allEvents.filter((e) => /transfer|approval/i.test(`${e.event} ${e.module}`)).length;
    const tamper = allEvents.filter((e) => /tamper|integrity|forge/i.test(`${e.event} ${e.newValue}`)).length;
    return [
      { value: String(allEvents.length), label: "Events" },
      { value: String(inventory), label: "Inventory adjustments" },
      { value: String(refunds), label: "Refunds" },
      { value: String(access), label: "Permission changes", color: access ? "var(--amber-tx)" : undefined },
      { value: String(transfers), label: "Transfer approvals" },
      { value: String(tamper), label: "Tamper alerts", color: tamper ? "var(--red-tx)" : undefined },
    ];
  }, [allEvents]);

  if (isLoading) return <CardSkeleton />;
  if (isError) return <ErrorState message="Couldn't load audit logs." onRetry={() => refetch()} />;

  return (
    <div className={styles.wrap}>
      {CONFIG ? (
        <Card className={styles.hintCard}>
          <p className={styles.hint}>{CONFIG.hint}</p>
          {CONFIG.flow.length > 0 ? <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} /> : null}
        </Card>
      ) : null}

      <KpiStrip kpis={liveKpis} moduleId="audit" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`No events in "${tab}"`} />
      ) : (
        <Card className={styles.feedCard}>
          {filtered.map((event) => (
            <div key={event.id} className={styles.row}>
              <span className={styles.time}>{event.time}</span>
              <div className={styles.body}>
                <div className={styles.top}>
                  <span className={styles.eventName}>{event.event}</span>
                  <span className={styles.module}>{event.module}</span>
                </div>
                <div className={styles.meta}>
                  {event.user} · {event.record} · {event.deviceIp}
                </div>
                <div className={styles.diff}>
                  <span className={styles.oldValue}>{event.oldValue}</span>
                  <span className={styles.arrow}>→</span>
                  <span className={styles.newValue}>{event.newValue}</span>
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
