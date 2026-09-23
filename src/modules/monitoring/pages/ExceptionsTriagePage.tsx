import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus } from "lucide-react";
import { useExceptions, useAssignException } from "@/modules/monitoring/hooks/useExceptions";
import { EXCEPTION_OWNER_OPTIONS } from "@/services/monitoring/exceptionsSeed";
import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import type { ExceptionCase } from "@/types/monitoring";
import type { WorkspaceRow } from "@/types/common";
import styles from "./ExceptionsTriagePage.module.css";

const CONFIG = SYSTEM_CONFIGS.exceptions;
const TABS = CONFIG?.tabs ?? [];
const FLOW = CONFIG?.flow ?? [];
const FLOW_AT = 4;

type Severity = "Critical" | "High" | "Medium";
const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium"];
const SEVERITY_COLOR: Record<Severity, { accent: string; bg: string }> = {
  Critical: { accent: "var(--red-tx)", bg: "var(--red-bg)" },
  High: { accent: "var(--amber-tx)", bg: "var(--amber-bg)" },
  Medium: { accent: "var(--blue-tx)", bg: "var(--blue-bg)" },
};

/** Mirrors the design's list-view `sev()` classifier (dc.html:8065) — severity is read off the
 * exception's own id/status text, not its type column. */
function listSeverityOf(id: string, statusLabel: string): Severity {
  const text = `${id} ${statusLabel}`;
  if (/breach|failed|payment|stuck/i.test(text)) return "Critical";
  if (/missing|delay|wrong/i.test(text)) return "High";
  return "Medium";
}

/** The detail view uses a slightly different word list (dc.html:6981) — a separate classifier in
 * the source, kept separate here rather than merged into one "close enough" function. */
function detailSeverityOf(id: string, statusLabel: string): Severity {
  const text = `${id}${statusLabel}`;
  if (/breach|failed|critical|offline|wrong|unknown/i.test(text)) return "Critical";
  if (/missing|delay|duplicate|short|mismatch/i.test(text)) return "High";
  return "Medium";
}

const RESOLUTION_LADDER = ["Detected", "Triaged", "Investigating", "Action taken", "Resolved", "Audited"];
const RESOLUTION_AT = Math.min(FLOW_AT, 4);

const SECONDARY_ACTIONS = [
  "Assign owner",
  "Retry payment",
  "Reassign picker",
  "Reassign rider",
  "Notify customer",
  "Issue refund",
  "Escalate",
];

export function ExceptionsTriagePage() {
  const { data: exceptions, isLoading, isError, refetch } = useExceptions();
  const assign = useAssignException();
  const { can } = usePermission();
  const currentUser = useSessionStore((s) => s.user?.name ?? "You");
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState(TABS[0] ?? "All open");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");

  const filtered = useMemo(() => {
    if (!exceptions) return [];
    return tab === "All open"
      ? exceptions.filter((e) => e.category !== "Resolved")
      : exceptions.filter((e) => e.category === tab);
  }, [exceptions, tab]);

  const grouped = useMemo(() => {
    const groups: Record<Severity, ExceptionCase[]> = { Critical: [], High: [], Medium: [] };
    for (const e of filtered) groups[listSeverityOf(e.id, e.status.label)].push(e);
    return groups;
  }, [filtered]);

  const liveKpis = useMemo(() => {
    const list = exceptions ?? [];
    const open = list.filter((e) => e.category !== "Resolved");
    const slaBreached = open.filter((e) => /breach|sla/i.test(`${e.id} ${e.status.label} ${e.type}`)).length;
    const payment = open.filter((e) => e.category === "Payment").length;
    const rider = open.filter((e) => /rider|unavailable/i.test(`${e.type} ${e.status.label}`)).length;
    const delivery = open.filter((e) => e.category === "Delivery").length;
    const ages = open
      .map((e) => {
        const m = String(e.age ?? "").match(/(\d+)\s*min/i);
        return m ? Number(m[1]) : null;
      })
      .filter((n): n is number => n != null);
    const avgMin = ages.length ? Math.round(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
    return [
      { value: String(open.length), label: "Open exceptions" },
      { value: String(slaBreached), label: "SLA breached", color: slaBreached ? "var(--red-tx)" : undefined },
      { value: String(payment), label: "Payment failures", color: payment ? "var(--red-tx)" : undefined },
      { value: String(rider), label: "Rider unavailable", color: rider ? "var(--amber-tx)" : undefined },
      { value: String(delivery), label: "Delivery failed", color: delivery ? "var(--amber-tx)" : undefined },
      { value: ages.length ? `${avgMin} min` : "—", label: "Avg resolution" },
    ];
  }, [exceptions]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !exceptions) return <ErrorState message="Couldn't load exceptions." onRetry={() => refetch()} />;

  const canAssign = can("exceptions", "assign");
  const selected = exceptions.find((e) => e.id === selectedId);

  function assignTo(exception: ExceptionCase, owner: string) {
    assign.mutate(
      { id: exception.id, owner },
      {
        onSuccess: () => pushToast(`${exception.id} — assigned to ${owner}`, "success"),
        onError: () => pushToast("Couldn't reassign the exception", "error"),
      }
    );
  }

  function markResolved(exception: ExceptionCase) {
    assign.mutate(
      { id: exception.id, owner: exception.owner },
      {
        onSuccess: () => {
          pushToast(`${exception.id} marked resolved`, "success");
          setSelectedId(undefined);
        },
      }
    );
  }

  if (selected) {
    const sev = detailSeverityOf(selected.id, selected.status.label);
    const color = SEVERITY_COLOR[sev];
    const stageName = FLOW[FLOW_AT]?.label ?? "this stage";
    const history = FLOW.slice(0, FLOW_AT + 1)
      .map((f, i) => ({ name: f.label, who: f.actor || "System", current: i === FLOW_AT }))
      .reverse();

    return (
      <div className={styles.wrap}>
        <button type="button" className={styles.backLink} onClick={() => setSelectedId(undefined)}>
          ← Back to centre
        </button>

        <Card className={styles.detailHero} style={{ borderLeftColor: color.accent }}>
          <div className={styles.detailBadgeRow}>
            <span className={styles.sevPill} style={{ background: color.bg, color: color.accent }}>
              {sev}
            </span>
            <Badge label={selected.status.label} tone={selected.status.tone} />
          </div>
          <div className={styles.detailTitle}>{selected.id}</div>

          <div className={styles.compareRow}>
            <div className={styles.compareBox}>
              <div className={styles.compareLabel}>What should have happened</div>
              <div className={styles.compareBody}>System expected: {stageName} to complete without intervention.</div>
            </div>
            <div className={styles.compareBox} style={{ background: color.bg }}>
              <div className={styles.compareLabel} style={{ color: color.accent }}>
                What actually happened
              </div>
              <div className={styles.compareBody} style={{ color: color.accent }}>
                Recorded instead: {selected.status.label} · Raised {selected.raisedAt}
              </div>
            </div>
          </div>
        </Card>

        <div className={styles.detailBoard}>
          <div className={styles.detailCol}>
            <Card className={styles.card}>
              <div className={styles.sectionTitle}>Resolution path</div>
              <div className={styles.ladderRow}>
                {RESOLUTION_LADDER.map((step, i) => (
                  <div key={step} className={styles.ladderStep}>
                    <div className={styles.ladderStepInner}>
                      <span
                        className={styles.ladderBadge}
                        style={{
                          background: i < RESOLUTION_AT ? "var(--brand)" : i === RESOLUTION_AT ? "var(--amber-tx)" : "var(--soft)",
                          color: i <= RESOLUTION_AT ? "#fff" : "var(--mu)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className={styles.ladderName}>{step}</div>
                    </div>
                    {i < RESOLUTION_LADDER.length - 1 ? <span className={styles.ladderArrow}>›</span> : null}
                  </div>
                ))}
              </div>
              {selected.category !== "Resolved" && canAssign ? (
                <div className={styles.resolveRow}>
                  <Button variant="primary" isLoading={assign.isPending} onClick={() => markResolved(selected)}>
                    Mark resolved
                  </Button>
                  <div className={styles.resolveNext}>Next: Resolved · Owner</div>
                </div>
              ) : null}
            </Card>

            <Card className={styles.card}>
              <div className={styles.sectionTitle}>Context at the time</div>
              <div className={styles.contextGrid}>
                <div className={styles.contextCell}>
                  <div className={styles.contextLabel}>Order</div>
                  <div className={styles.contextValue}>{selected.order}</div>
                </div>
                <div className={styles.contextCell}>
                  <div className={styles.contextLabel}>Store</div>
                  <div className={styles.contextValue}>{selected.store}</div>
                </div>
                <div className={styles.contextCell}>
                  <div className={styles.contextLabel}>Type</div>
                  <div className={styles.contextValue}>{selected.type}</div>
                </div>
                <div className={styles.contextCell}>
                  <div className={styles.contextLabel}>Raised</div>
                  <div className={styles.contextValue}>{selected.raisedAt}</div>
                </div>
                <div className={styles.contextCell}>
                  <div className={styles.contextLabel}>Owner</div>
                  <div className={styles.contextValue}>{selected.owner}</div>
                </div>
                <div className={styles.contextCell}>
                  <div className={styles.contextLabel}>Age</div>
                  <div className={styles.contextValue}>{selected.age}</div>
                </div>
              </div>
            </Card>
          </div>

          <div className={styles.sideCol}>
            {canAssign ? (
              <Card className={styles.card}>
                <div className={styles.sectionTitleSm}>Actions available</div>
                <div className={styles.actionsList}>
                  {SECONDARY_ACTIONS.map((label) => (
                    <button
                      key={label}
                      type="button"
                      className={styles.actionBtn}
                      onClick={() =>
                        label === "Assign owner"
                          ? assignTo(selected, currentUser)
                          : pushToast(`${label}: ${selected.id}`, "info")
                      }
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Card>
            ) : null}

            <Card className={styles.card}>
              <div className={styles.sectionTitleSm}>Event sequence</div>
              <div className={styles.timeline}>
                {history.map((h) => (
                  <div key={h.name} className={styles.timelineRow}>
                    <span className={styles.timelineDot} data-current={h.current} />
                    <div>
                      <div className={styles.timelineName}>{h.name}</div>
                      <div className={styles.timelineMeta}>{h.who}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className={styles.card}>
              <div className={styles.sectionTitleSm}>Jump to source</div>
              <div className={styles.linkedList}>
                <Link to="/orders" className={styles.linkedItem}>
                  <div className={styles.linkedLabel}>Order</div>
                  <div className={styles.linkedRef}>{selected.order}</div>
                </Link>
                <Link to="/stores" className={styles.linkedItem}>
                  <div className={styles.linkedLabel}>Dark store</div>
                  <div className={styles.linkedRef}>{selected.store}</div>
                </Link>
                <Link to="/support" className={styles.linkedItem}>
                  <div className={styles.linkedLabel}>Owner queue</div>
                  <div className={styles.linkedRef}>{selected.owner}</div>
                </Link>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="exceptions" flow={FLOW} activeIndex={FLOW_AT} />

      <KpiStrip kpis={liveKpis} moduleId="exceptions" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`Nothing in "${tab}"`} />
      ) : view === "list" ? (
        <RecordsListTable
          columns={CONFIG?.columns ?? []}
          rows={filtered.map(
            (e): WorkspaceRow => [e.id, e.order, e.store, e.type, e.raisedAt, e.owner, e.age, e.status]
          )}
          onRowClick={(i) => setSelectedId(filtered[i]!.id)}
        />
      ) : (
        <div className={styles.groups}>
          {SEVERITY_ORDER.map((sev) => {
            const cases = grouped[sev];
            const color = SEVERITY_COLOR[sev];
            return (
              <div key={sev}>
                <div className={styles.groupHeader}>
                  <span className={styles.groupDot} style={{ background: color.accent }} />
                  <div className={styles.groupName}>{sev}</div>
                  <span className={styles.groupCount} style={{ background: color.bg, color: color.accent }}>
                    {cases.length}
                  </span>
                </div>

                {cases.length > 0 ? (
                  <div className={styles.grid}>
                    {cases.map((exception) => (
                      <Card
                        key={exception.id}
                        className={styles.card}
                        style={{ borderLeftColor: color.accent }}
                        onClick={() => setSelectedId(exception.id)}
                      >
                        <div className={styles.cardHeader}>
                          <div className={styles.exceptionId}>{exception.id}</div>
                          <Badge label={exception.status.label} tone={exception.status.tone} />
                        </div>

                        <div className={styles.refLine}>
                          {exception.raisedAt !== "—" ? `Raised: ${exception.raisedAt} · ` : ""}Owner: {exception.owner}
                        </div>

                        <div className={styles.statsGrid}>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Order</span>
                            <span className={styles.statValue}>{exception.order}</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Store</span>
                            <span className={styles.statValue}>{exception.store}</span>
                          </div>
                          <div className={styles.stat}>
                            <span className={styles.statLabel}>Type</span>
                            <span className={styles.statValue}>{exception.type}</span>
                          </div>
                        </div>

                        {canAssign && exception.category !== "Resolved" ? (
                          <div
                            className={styles.actionsRow}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                            role="presentation"
                          >
                            <Button
                              size="sm"
                              variant="primary"
                              isLoading={assign.isPending}
                              onClick={() => assignTo(exception, currentUser)}
                            >
                              <UserPlus size={13} /> Assign to me
                            </Button>
                            <DropdownMenu
                              trigger={
                                <button type="button" className={styles.menuBtn}>
                                  Reassign ⋯
                                </button>
                              }
                              items={EXCEPTION_OWNER_OPTIONS.map((owner) => ({
                                label: owner,
                                onSelect: () => assignTo(exception, owner),
                              }))}
                            />
                          </div>
                        ) : null}
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className={styles.groupEmpty}>Nothing at this severity right now.</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
