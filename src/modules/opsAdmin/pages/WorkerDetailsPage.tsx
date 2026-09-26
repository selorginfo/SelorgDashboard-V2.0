import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { OpsRangeFilter, type OpsRangeFilterValue } from "@/modules/opsAdmin/components/OpsRangeFilter";
import {
  usePickerDetail,
  usePickerStats,
  useRiderDetail,
  useRiderStats,
} from "@/modules/opsAdmin/hooks/useAdminOps";
import type { ModuleId } from "@/constants/nav";
import type { KpiStat } from "@/types/common";
import type { OpsMetric, WorkerDetailBundle } from "@/types/adminOps";
import styles from "./OpsAdmin.module.css";

type Kind = "rider" | "picker";

const MODULE: Record<Kind, ModuleId> = {
  rider: "rider-details",
  picker: "picker-details",
};

const TABS = ["Overview", "Orders", "Activity", "Stats"] as const;

function MetricsBlock({ title, metrics }: { title: string; metrics: OpsMetric[] }) {
  if (metrics.length === 0) {
    return (
      <Card className={styles.sectionCard}>
        <div className={styles.sectionTitle}>{title}</div>
        <EmptyState title={`No ${title.toLowerCase()} data`} />
      </Card>
    );
  }
  return (
    <Card className={styles.sectionCard}>
      <div className={styles.sectionTitle}>{title}</div>
      <div className={styles.metrics}>
        {metrics.map((m) => (
          <div key={`${title}-${m.label}`} className={styles.metric}>
            <span className={styles.metricValue}>{m.value}</span>
            <span className={styles.metricLabel}>{m.label}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WorkerDetailsView({ kind }: { kind: Kind }) {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const moduleId = MODULE[kind];
  const [tab, setTab] = useState<(typeof TABS)[number]>("Overview");
  const [range, setRange] = useState<OpsRangeFilterValue>({
    range: "today",
    from: "",
    to: "",
  });

  const riderDetail = useRiderDetail(kind === "rider" ? id : undefined);
  const pickerDetail = usePickerDetail(kind === "picker" ? id : undefined);
  const riderStats = useRiderStats(kind === "rider" ? id : undefined, range);
  const pickerStats = usePickerStats(kind === "picker" ? id : undefined, range);

  const detailQ = kind === "rider" ? riderDetail : pickerDetail;
  const statsQ = kind === "rider" ? riderStats : pickerStats;
  const detail = detailQ.data as WorkerDetailBundle | undefined;

  const kpis: KpiStat[] = useMemo(() => {
    if (!detail) return [];
    const fromStats = (statsQ.data?.metrics ?? []).slice(0, 4).map((m) => ({
      value: m.value,
      label: m.label,
    }));
    if (fromStats.length > 0) {
      return [
        { value: detail.name, label: kind === "rider" ? "Rider" : "Picker" },
        { value: detail.status.label, label: "Status" },
        ...fromStats.slice(0, 4),
      ].slice(0, 6);
    }
    return [
      { value: detail.name || "—", label: kind === "rider" ? "Rider" : "Picker" },
      { value: detail.status.label, label: "Status" },
      { value: detail.phone || "—", label: "Phone" },
      { value: String(detail.orders.length), label: "Orders listed" },
      { value: String(detail.activity.length), label: "Activity events" },
      { value: String(detail.docs.length), label: "Documents" },
    ];
  }, [detail, statsQ.data, kind]);

  if (!id) {
    return (
      <div className={styles.wrap}>
        <PurposeBanner moduleId={moduleId} />
        <EmptyState
          title={`Select a ${kind} to view details`}
          description={`Open ${kind === "rider" ? "Rider" : "Picker"} Directory and choose View details, or open /${moduleId}/:id.`}
        />
      </div>
    );
  }

  if (detailQ.isLoading) return <CardSkeleton />;
  if (detailQ.isError || !detail) {
    return (
      <ErrorState
        message={`Couldn't load ${kind} details.`}
        onRetry={() => void detailQ.refetch()}
      />
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId={moduleId} />

      <Card className={styles.hintCard}>
        <div className={styles.headerRow}>
          <div className={styles.nameBlock}>
            <div className={styles.name}>{detail.name}</div>
            <div className={styles.sub}>
              {detail.id} · {detail.phone}
            </div>
          </div>
          <Badge label={detail.status.label} tone={detail.status.tone} />
        </div>
      </Card>

      {kpis.length > 0 ? <KpiStrip kpis={kpis} moduleId={moduleId} /> : null}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.tabChip}
            data-active={t === tab}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "Overview" ? (
        <div className={styles.sectionGrid}>
          <MetricsBlock title="Profile" metrics={detail.profile} />
          <MetricsBlock title="Work" metrics={detail.work} />
          <MetricsBlock title="Location" metrics={detail.location} />
          <MetricsBlock title="Earnings" metrics={detail.earnings} />
          <MetricsBlock title="Attendance" metrics={detail.attendance} />
          <Card className={styles.sectionCard}>
            <div className={styles.sectionTitle}>Documents</div>
            {detail.docs.length === 0 ? (
              <EmptyState title="No documents" />
            ) : (
              <div className={styles.docList}>
                {detail.docs.map((d) => (
                  <div key={d.id} className={styles.docRow}>
                    <div>
                      <div className={styles.docLabel}>{d.label}</div>
                      {d.value ? <div className={styles.docMeta}>{d.value}</div> : null}
                    </div>
                    <Badge label={d.status} tone="grey" />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      ) : null}

      {tab === "Orders" ? (
        detail.orders.length === 0 ? (
          <EmptyState title="No orders on this profile" />
        ) : (
          <Card className={styles.sectionCard}>
            <div className={styles.orderList}>
              {detail.orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={styles.orderRow}
                  onClick={() => navigate(`/orders/${o.id}`)}
                >
                  <div>
                    <div className={styles.orderNum}>{o.orderNumber}</div>
                    <div className={styles.orderMeta}>
                      {[o.status, o.store, o.amount, o.createdAt].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )
      ) : null}

      {tab === "Activity" ? (
        detail.activity.length === 0 ? (
          <EmptyState title="No activity events" />
        ) : (
          <Card className={styles.feedCard}>
            {detail.activity.map((a) => (
              <div key={a.id} className={styles.feedRow}>
                <span className={styles.feedTime}>{a.time}</span>
                <div className={styles.feedBody}>
                  <div className={styles.feedEvent}>{a.event}</div>
                  {a.detail ? <div className={styles.feedMeta}>{a.detail}</div> : null}
                </div>
              </div>
            ))}
          </Card>
        )
      ) : null}

      {tab === "Stats" ? (
        <>
          <Card className={styles.filterCard}>
            <OpsRangeFilter value={range} onChange={setRange} />
          </Card>
          {statsQ.isLoading ? (
            <CardSkeleton />
          ) : statsQ.isError ? (
            <EmptyState title="No stats for this range" />
          ) : (
            <>
              <MetricsBlock title="Range metrics" metrics={statsQ.data?.metrics ?? []} />
              {(statsQ.data?.orders.length ?? 0) === 0 ? (
                <EmptyState title="No orders in this range" />
              ) : (
                <Card className={styles.sectionCard}>
                  <div className={styles.sectionTitle}>Orders in range</div>
                  <div className={styles.orderList}>
                    {(statsQ.data?.orders ?? []).map((o) => (
                      <button
                        key={o.id}
                        type="button"
                        className={styles.orderRow}
                        onClick={() => navigate(`/orders/${o.id}`)}
                      >
                        <div>
                          <div className={styles.orderNum}>{o.orderNumber}</div>
                          <div className={styles.orderMeta}>
                            {[o.status, o.amount, o.createdAt].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      ) : null}
    </div>
  );
}

export function RiderDetailsPage() {
  return <WorkerDetailsView kind="rider" />;
}

export function PickerDetailsPage() {
  return <WorkerDetailsView kind="picker" />;
}
