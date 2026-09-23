import { useState, useMemo } from "react";
import { useBags, useMarkRacked } from "@/modules/darkstore/hooks/useBags";
import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { Bag } from "@/types/darkstore";
import type { KpiStat } from "@/types/common";
import styles from "./BagsPage.module.css";

const CONFIG = DARKSTORE_CONFIGS.bags;
const TABS = CONFIG?.tabs ?? [];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function computeKpis(bags: Bag[]): KpiStat[] {
  const bagQueue = bags.filter((b) => b.tab === "Bag queue").length;
  const awaitingRack = bags.filter((b) => b.tab === "Awaiting rack").length;
  const racked = bags.filter((b) => b.tab === "Racked").length;
  const readyForRider = bags.filter((b) => b.tab === "Racked" && b.status.label === "Ready").length;
  const exceptions = bags.filter((b) => b.tab === "Exceptions").length;

  const totalScanned = bags.reduce((sum, b) => sum + b.scanned, 0);
  const totalItems = bags.reduce((sum, b) => sum + b.total, 0);
  const scanSuccess = totalItems > 0 ? ((totalScanned / totalItems) * 100).toFixed(1) + "%" : "—";

  return [
    { label: "Bags being picked", value: String(bagQueue) },
    { label: "Awaiting rack placement", value: String(awaitingRack), color: "var(--amber-tx)" },
    { label: "Bags racked", value: String(racked) },
    { label: "Ready for rider", value: String(readyForRider) },
    { label: "Product scan success", value: scanSuccess },
    { label: "Barcode exceptions", value: String(exceptions), color: "var(--red-tx)" },
  ];
}

function progressColor(pct: number): string {
  if (pct === 100) return "var(--brand)";
  if (pct >= 50) return "var(--amber-tx)";
  return "var(--red-tx)";
}

/** Derives the next open staging rack for a bag's store from its own store code, e.g.
 * "DS-01 Indiranagar" → "DS01-R01" — a reasonable stand-in since the design doesn't specify which
 * rack a "Mark racked" scan lands on. */
function suggestedRack(store: string): string {
  const code = /DS-(\d+)/.exec(store)?.[1] ?? "01";
  return `DS${code}-R01`;
}

function BagCard({
  bag,
  canMarkRacked,
  onMarkRacked,
  isPending,
}: {
  bag: Bag;
  canMarkRacked: boolean;
  onMarkRacked?: (id: string, rack: string) => void;
  isPending?: boolean;
}) {
  const pct = bag.total > 0 ? Math.round((bag.scanned / bag.total) * 100) : 0;
  return (
    <Card className={styles.bagCard}>
      <div className={styles.cardTop}>
        <span className={styles.bagId}>{bag.id}</span>
        <Badge label={bag.status.label} tone={bag.status.tone} />
      </div>
      <div className={styles.cardMeta}>
        {bag.order} · {bag.store}
      </div>
      <div className={styles.cardMeta}>{bag.picker !== "—" ? bag.picker : "Unassigned"}</div>

      <div className={styles.barRow}>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%`, background: progressColor(pct) }} />
        </div>
        <span className={styles.barLabel}>
          {bag.scanned} / {bag.total}
        </span>
      </div>

      <div className={styles.remaining} data-done={bag.total - bag.scanned <= 0}>
        {bag.total - bag.scanned > 0 ? `${bag.total - bag.scanned} item(s) still to scan` : "All items verified"}
      </div>
      <div className={styles.cardMeta}>{bag.rack !== "—" ? `Rack ${bag.rack}` : "Not racked"}</div>

      {canMarkRacked && onMarkRacked ? (
        <div className={styles.cardActions}>
          <Button size="sm" isLoading={isPending} onClick={() => onMarkRacked(bag.id, suggestedRack(bag.store))}>
            Mark racked
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function BagsPage() {
  const [date, setDate] = useState(todayIso());
  const [storeFilter, setStoreFilter] = useState("All");

  const { data: bags, isLoading, isError, refetch } = useBags(date);
  const markRacked = useMarkRacked();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState(TABS[0] ?? "Bag queue");
  const [rackingId, setRackingId] = useState<string | undefined>(undefined);

  const allBags = bags ?? [];
  const stores = useMemo(
    () => ["All", ...Array.from(new Set(allBags.map((b) => b.store))).sort()],
    [allBags],
  );
  const filtered = useMemo(
    () => (storeFilter === "All" ? allBags : allBags.filter((b) => b.store === storeFilter)),
    [allBags, storeFilter],
  );

  if (isLoading) return <CardSkeleton />;
  if (isError || !bags) return <ErrorState message="Couldn't load bags." onRetry={() => refetch()} />;

  const canEdit = can("bags", "edit");
  const liveKpis = computeKpis(filtered);

  function handleMarkRacked(id: string, rack: string) {
    setRackingId(id);
    markRacked.mutate(
      { id, rack },
      {
        onSuccess: () => {
          pushToast(`${id} racked at ${rack}`, "success");
          setRackingId(undefined);
        },
        onError: () => setRackingId(undefined),
      }
    );
  }

  const byTab = (t: string) => filtered.filter((b) => b.tab === t);
  const shown = tab === "Exceptions" ? [] : byTab(tab);
  const exceptions = byTab("Exceptions");

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="bags" flow={CONFIG?.flow} activeIndex={CONFIG?.flowAt} />

      <KpiStrip kpis={liveKpis} moduleId="bags" />

      <div className={styles.filterBar}>
        <input
          type="date"
          className={styles.dateInput}
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
        />
        <select className={styles.filterSelect} value={storeFilter} onChange={(e) => setStoreFilter(e.target.value)}>
          {stores.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {(storeFilter !== "All" || date !== todayIso()) && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => { setDate(todayIso()); setStoreFilter("All"); }}
          >
            Clear
          </button>
        )}
      </div>

      {CONFIG && CONFIG.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <FlowStrip flow={CONFIG.flow} activeIndex={CONFIG.flowAt} />
        </Card>
      ) : null}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Exceptions" ? (
        exceptions.length === 0 ? (
          <EmptyState title="No exceptions" description="No barcode exceptions right now." />
        ) : (
          <div className={styles.alertList}>
            {exceptions.map((bag) => (
              <Card key={bag.id} className={styles.alertRow}>
                <div className={styles.alertMain}>
                  <span className={styles.bagId}>{bag.id}</span>
                  <span className={styles.cardMeta}>
                    {bag.order} · {bag.store}
                  </span>
                </div>
                <div className={styles.alertEnd}>
                  <span className={styles.cardMeta}>
                    {bag.scanned} / {bag.total} scanned
                  </span>
                  <Badge label={bag.status.label} tone={bag.status.tone} />
                </div>
              </Card>
            ))}
          </div>
        )
      ) : shown.length === 0 ? (
        <EmptyState title={`Nothing in "${tab}"`} />
      ) : (
        <div className={styles.cardGrid}>
          {shown.map((bag) => (
            <BagCard
              key={bag.id}
              bag={bag}
              canMarkRacked={canEdit && tab === "Awaiting rack"}
              onMarkRacked={handleMarkRacked}
              isPending={markRacked.isPending && rackingId === bag.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
