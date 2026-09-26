import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { FULFILLMENT_STAGES } from "@/services/adminOps";
import { useOrderProgress } from "@/modules/opsAdmin/hooks/useAdminOps";
import type { KpiStat } from "@/types/common";
import styles from "./OpsAdmin.module.css";

export function OrderProgressPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("");
  const [store, setStore] = useState("");
  const [expandedId, setExpandedId] = useState<string | undefined>();
  const { data, isLoading, isError, refetch } = useOrderProgress({
    status: status || undefined,
    store: store || undefined,
  });

  const rows = data ?? [];

  const kpis: KpiStat[] = useMemo(() => {
    const counts = FULFILLMENT_STAGES.map((s) => ({
      value: String(rows.filter((r) => r.fulfillmentStage === s.value).length),
      label: s.label,
    }));
    return [
      { value: String(rows.length), label: "Orders" },
      ...counts.slice(0, 5),
    ];
  }, [rows]);

  if (isLoading) return <CardSkeleton />;
  if (isError) {
    return <ErrorState message="Couldn't load order progress." onRetry={() => void refetch()} />;
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="order-progress" />

      <Card className={styles.filterCard}>
        <div className={styles.filtersRow}>
          <label className={styles.field}>
            <span>Status / stage</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All stages</option>
              {FULFILLMENT_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Store</span>
            <input
              value={store}
              onChange={(e) => setStore(e.target.value)}
              placeholder="Store id or name"
            />
          </label>
        </div>
      </Card>

      <KpiStrip kpis={kpis} moduleId="order-progress" />

      {rows.length === 0 ? (
        <EmptyState title="No orders in progress" />
      ) : (
        <div className={styles.sectionGrid}>
          {rows.map((row) => {
            const open = expandedId === row.id;
            return (
              <Card
                key={row.id}
                className={styles.progressCard}
                onClick={() => setExpandedId(open ? undefined : row.id)}
              >
                <div className={styles.progressTop}>
                  <div>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/orders/${row.id}`);
                      }}
                    >
                      {row.orderNumber}
                    </button>
                    <div className={styles.orderMeta}>
                      {[row.store, row.picker && `Picker: ${row.picker}`, row.rider && `Rider: ${row.rider}`]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                  </div>
                  <Badge
                    label={row.fulfillmentLabel}
                    tone={row.fulfillmentStage === "exception" ? "red" : "blue"}
                  />
                </div>

                <div className={styles.stageStrip}>
                  {FULFILLMENT_STAGES.map((s) => (
                    <span
                      key={s.value}
                      className={styles.stagePill}
                      data-active={row.fulfillmentStage === s.value}
                      data-exception={s.value === "exception" && row.fulfillmentStage === "exception"}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>

                {open ? (
                  row.timeline.length === 0 ? (
                    <p className={styles.note} style={{ marginTop: 12 }}>
                      No timeline events from order logs.
                    </p>
                  ) : (
                    <div className={styles.timeline}>
                      {row.timeline.map((ev) => (
                        <div key={ev.id} className={styles.timelineItem}>
                          <span className={styles.feedTime}>{ev.time}</span>
                          <div className={styles.feedBody}>
                            <div className={styles.feedEvent}>{ev.status}</div>
                            <div className={styles.feedMeta}>
                              {[ev.actor, ev.note].filter(Boolean).join(" · ")}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
