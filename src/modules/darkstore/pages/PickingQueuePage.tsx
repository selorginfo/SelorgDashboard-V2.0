import { useState, useMemo } from "react";
import { usePickingOrders, useReassignPicker } from "@/modules/darkstore/hooks/usePicking";
import { useDirectory } from "@/modules/workforce/hooks/useDirectory";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { PickingOrder } from "@/types/darkstore";
import type { KpiStat } from "@/types/common";
import styles from "./PickingQueuePage.module.css";

const TABS = ["Picking queue", "Packing", "Picker performance", "Exceptions"];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function progressColor(pct: number): string {
  if (pct === 100) return "var(--brand)";
  if (pct >= 50) return "var(--amber-tx)";
  return "var(--red-tx)";
}

function nextPicker(current: string, roster: string[]): string {
  if (roster.length === 0) return current === "—" ? "Unassigned" : current;
  const idx = roster.indexOf(current);
  return roster[(idx + 1) % roster.length]!;
}

function ProgressCard({
  order,
  canAssign,
  onReassign,
  isPending,
  roster,
}: {
  order: PickingOrder;
  canAssign: boolean;
  onReassign?: (id: string, picker: string) => void;
  isPending?: boolean;
  roster: string[];
}) {
  const pct = order.items > 0 ? Math.round((order.picked / order.items) * 100) : 0;
  return (
    <Card className={styles.progressCard}>
      <div className={styles.cardTop}>
        <span className={styles.orderId}>{order.id}</span>
        <Badge label={order.status.label} tone={order.status.tone} />
      </div>
      <div className={styles.cardMeta}>{order.store}</div>
      <div className={styles.cardMeta}>
        {order.picker !== "—" ? order.picker : "Unassigned"} · Started {order.started} · {order.elapsed} elapsed
      </div>

      <div className={styles.barRow}>
        <div className={styles.bar}>
          <div className={styles.barFill} style={{ width: `${pct}%`, background: progressColor(pct) }} />
        </div>
        <span className={styles.barLabel}>
          {order.picked} / {order.items}
        </span>
      </div>
      <div className={styles.remaining} data-done={order.items - order.picked <= 0}>
        {order.items - order.picked > 0
          ? `${order.items - order.picked} item(s) still to pick`
          : "All items picked"}
      </div>

      {canAssign && onReassign ? (
        <div className={styles.cardActions}>
          <Button
            size="sm"
            isLoading={isPending}
            disabled={roster.length === 0}
            onClick={() => onReassign(order.id, nextPicker(order.picker, roster))}
          >
            Reassign picker
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function PickingQueuePage() {
  const [date, setDate] = useState(todayIso());
  const [storeFilter, setStoreFilter] = useState("All");
  const [pickerFilter, setPickerFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: orders, isLoading, isError, refetch } = usePickingOrders(date);
  const { data: directory } = useDirectory("picker");
  const reassign = useReassignPicker();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState(TABS[0] ?? "Picking queue");
  const [reassigningId, setReassigningId] = useState<string | undefined>(undefined);

  const allOrders = orders ?? [];
  const liveRoster = useMemo(() => {
    const fromDir = (directory ?? []).map((p) => p.name).filter(Boolean);
    const fromOrders = allOrders.map((o) => o.picker).filter((p) => p && p !== "—");
    return Array.from(new Set([...fromDir, ...fromOrders]));
  }, [directory, allOrders]);

  const stores = useMemo(() => ["All", ...Array.from(new Set(allOrders.map((o) => o.store))).sort()], [allOrders]);
  const pickers = useMemo(
    () => ["All", ...Array.from(new Set(allOrders.map((o) => o.picker).filter((p) => p !== "—"))).sort()],
    [allOrders],
  );
  const statuses = useMemo(
    () => ["All", ...Array.from(new Set(allOrders.map((o) => o.status.label))).sort()],
    [allOrders],
  );

  const filtered = useMemo(() => {
    return allOrders.filter((o) => {
      // Client-side date guard in case the API doesn't honour the date param
      if (o.createdAt && o.createdAt.slice(0, 10) !== date) return false;
      if (storeFilter !== "All" && o.store !== storeFilter) return false;
      if (pickerFilter !== "All" && o.picker !== pickerFilter) return false;
      if (statusFilter !== "All" && o.status.label !== statusFilter) return false;
      return true;
    });
  }, [allOrders, date, storeFilter, pickerFilter, statusFilter]);

  const kpis = useMemo((): KpiStat[] => {
    const pendingPicking = filtered.filter((o) => o.tab === "Picking queue").length;
    const pendingPacking = filtered.filter((o) => o.tab === "Packing").length;
    const ready = filtered.filter((o) => o.status.label === "Ready").length;
    return [
      { label: "Pending picking", value: String(pendingPicking) },
      { label: "Pending packing", value: String(pendingPacking) },
      { label: "Ready", value: String(ready) },
    ];
  }, [filtered]);

  const pickerStats = useMemo(() => {
    const map = new Map<string, { store: string; orders: number; items: number; picked: number }>();
    for (const o of filtered) {
      if (o.picker === "—") continue;
      const prev = map.get(o.picker) ?? { store: o.store, orders: 0, items: 0, picked: 0 };
      map.set(o.picker, {
        store: prev.store,
        orders: prev.orders + 1,
        items: prev.items + o.items,
        picked: prev.picked + o.picked,
      });
    }
    return Array.from(map.entries())
      .map(([picker, s]) => ({
        picker,
        store: s.store,
        orders: s.orders,
        items: s.items,
        accuracy: s.items > 0 ? ((s.picked / s.items) * 100).toFixed(1) + "%" : "—",
      }))
      .sort((a, b) => b.orders - a.orders);
  }, [filtered]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !orders) return <ErrorState message="Couldn't load the picking queue." onRetry={() => refetch()} />;

  const canAssign = can("picking", "assign");

  function handleReassign(id: string, picker: string) {
    setReassigningId(id);
    reassign.mutate(
      { id, picker },
      {
        onSuccess: () => {
          pushToast(`${id} reassigned to ${picker}`, "success");
          setReassigningId(undefined);
        },
        onError: () => {
          pushToast(`Couldn't reassign ${id}`, "error");
          setReassigningId(undefined);
        },
      }
    );
  }

  const queueOrders = filtered.filter((o) => o.tab === "Picking queue");
  const packingOrders = filtered.filter((o) => o.tab === "Packing");
  const exceptionOrders = filtered.filter((o) => o.tab === "Exceptions");

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={kpis} moduleId="picking" />

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
        <select className={styles.filterSelect} value={pickerFilter} onChange={(e) => setPickerFilter(e.target.value)}>
          {pickers.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          {statuses.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        {(storeFilter !== "All" || pickerFilter !== "All" || statusFilter !== "All" || date !== todayIso()) && (
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => {
              setDate(todayIso());
              setStoreFilter("All");
              setPickerFilter("All");
              setStatusFilter("All");
            }}
          >
            Clear
          </button>
        )}
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Picking queue" ? (
        queueOrders.length === 0 ? (
          <EmptyState title="Picking queue is clear" />
        ) : (
          <div className={styles.cardGrid}>
            {queueOrders.map((order) => (
              <ProgressCard
                key={order.id}
                order={order}
                canAssign={canAssign}
                onReassign={handleReassign}
                isPending={reassign.isPending && reassigningId === order.id}
                roster={liveRoster}
              />
            ))}
          </div>
        )
      ) : tab === "Packing" ? (
        packingOrders.length === 0 ? (
          <EmptyState title="Nothing in packing right now" />
        ) : (
          <div className={styles.cardGrid}>
            {packingOrders.map((order) => (
              <ProgressCard key={order.id} order={order} canAssign={false} roster={liveRoster} />
            ))}
          </div>
        )
      ) : tab === "Picker performance" ? (
        pickerStats.length === 0 ? (
          <EmptyState title="No picker activity" description="No orders found for the selected filters." />
        ) : (
          <div className={styles.statGrid}>
            {pickerStats.map((p) => (
              <Card key={p.picker} className={styles.statCard}>
                <div className={styles.statTop}>
                  <span className={styles.statName}>{p.picker}</span>
                </div>
                <div className={styles.statMeta}>{p.store}</div>
                <div className={styles.statRow}>
                  <div className={styles.statCell}>
                    <span className={styles.statValue}>{p.orders}</span>
                    <span className={styles.statLabel}>Orders</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statValue}>{p.items}</span>
                    <span className={styles.statLabel}>Items</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statValue}>{p.accuracy}</span>
                    <span className={styles.statLabel}>Accuracy</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : exceptionOrders.length === 0 ? (
        <EmptyState title="No exceptions" description="Nothing needs attention right now." />
      ) : (
        <div className={styles.alertList}>
          {exceptionOrders.map((order) => (
            <Card key={order.id} className={styles.alertRow}>
              <div className={styles.alertMain}>
                <span className={styles.orderId}>{order.id}</span>
                <span className={styles.cardMeta}>
                  {order.store} · {order.picker !== "—" ? order.picker : "Unassigned"}
                </span>
              </div>
              <div className={styles.alertEnd}>
                <span className={styles.cardMeta}>
                  {order.picked} / {order.items} picked · {order.elapsed}
                </span>
                <Badge label={order.status.label} tone={order.status.tone} />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
