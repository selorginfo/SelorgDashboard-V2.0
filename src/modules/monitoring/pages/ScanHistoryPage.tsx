import { useMemo, useState } from "react";
import { useScanHistory } from "@/modules/monitoring/hooks/useScanHistory";
import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import type { ScanHistoryEvent } from "@/types/monitoring";
import type { KpiStat } from "@/types/common";
import styles from "./ScanHistoryPage.module.css";

const CONFIG = DARKSTORE_CONFIGS["scan-history"];
const TABS = CONFIG?.tabs ?? ["All scans", "Product scans", "Bag scans", "Rack scans", "Failures"];

function matchesTab(event: ScanHistoryEvent, tab: string): boolean {
  if (tab === "All scans") return true;
  if (tab === "Product scans") return event.entity === "Product";
  if (tab === "Bag scans") return event.entity === "Bag";
  if (tab === "Rack scans") return event.entity === "Rack";
  if (tab === "Failures") return event.status.tone === "red" || event.status.tone === "amber";
  return true;
}

/** Every barcode scan event from Picker / HSD Scanner — live API only, no seed fallback. */
export function ScanHistoryPage() {
  const [tab, setTab] = useState(TABS[0] ?? "All scans");
  const { data: apiScans, isLoading, isError, refetch } = useScanHistory();
  const allScans = apiScans ?? [];

  const filtered = useMemo(() => allScans.filter((e) => matchesTab(e, tab)), [tab, allScans]);

  const liveKpis: KpiStat[] = useMemo(() => {
    const product = allScans.filter((e) => e.entity === "Product").length;
    const bag = allScans.filter((e) => e.entity === "Bag").length;
    const rack = allScans.filter((e) => e.entity === "Rack").length;
    const failures = allScans.filter((e) => e.status.tone === "red" || e.status.tone === "amber").length;
    return [
      { value: String(allScans.length), label: "Scans" },
      { value: String(product), label: "Product" },
      { value: String(bag), label: "Bag" },
      { value: String(rack), label: "Rack" },
      { value: String(failures), label: "Failures", color: failures ? "var(--red-tx)" : undefined },
      { value: String(filtered.length), label: "In view" },
    ];
  }, [allScans, filtered]);

  if (isLoading) return <CardSkeleton />;
  if (isError) return <ErrorState message="Couldn't load scan history." onRetry={() => refetch()} />;

  return (
    <div className={styles.wrap}>
      {CONFIG ? (
        <Card className={styles.hintCard}>
          <p className={styles.hint}>{CONFIG.hint}</p>
          {CONFIG.flow.length > 0 ? <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} /> : null}
        </Card>
      ) : null}

      <KpiStrip kpis={liveKpis} moduleId="scan-history" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`No scans in "${tab}"`} />
      ) : (
        <Card className={styles.feedCard}>
          {filtered.map((event) => (
            <div key={event.id} className={styles.feedRow} data-tone={event.status.tone}>
              <span className={styles.feedTime}>{event.time}</span>
              <div className={styles.feedBody}>
                <div className={styles.feedTop}>
                  <span className={styles.feedRef}>{event.reference}</span>
                  <Badge label={event.status.label} tone={event.status.tone} />
                </div>
                <div className={styles.feedMeta}>
                  <Badge label={event.entity} tone="grey" /> {event.barcode} · {event.order} · {event.picker} ·{" "}
                  {event.device}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
