import { useMemo, useState } from "react";
import { useContentCalendar } from "@/modules/cms/hooks/useContentCalendar";
import { useSetContentStage } from "@/modules/cms/hooks/useContent";
import type { ScheduledContent } from "@/types/scheduledContent";
import type { ContentStage } from "@/types/contentItem";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { WorkspaceRow } from "@/types/common";
import styles from "./ContentCalendarPage.module.css";

const TABS = ["Next 14 days", "Going live", "Expiring", "Conflicts"];

const FLOW = [
  { label: "Approved", actor: "" },
  { label: "Scheduled", actor: "" },
  { label: "Goes live", actor: "" },
  { label: "Expires", actor: "" },
  { label: "Archived", actor: "" },
];
const FLOW_AT = 2;

const LADDER = ["Draft", "In review", "Approved", "Scheduled", "Published", "Archived"];
/** Mirrors the design's own generic "editor" detail pattern: try to match the item's own status
 * label against a ladder step name, and fall back to the module's flowAt (2 = "Approved") when
 * the status uses calendar-specific language ("Goes live", "Expires…") that doesn't map 1:1. */
function ladderIndexFor(statusLabel: string): number {
  const idx = LADDER.findIndex((step) => new RegExp(step.split(" ")[0]!, "i").test(statusLabel));
  return idx === -1 ? FLOW_AT : idx;
}

const CAL_ACTIONS = ["Schedule publish", "Reschedule", "Resolve slot clash", "Unpublish"];

function tabsFor(item: ScheduledContent): string[] {
  const tabs = ["Next 14 days"];
  if (item.status.label === "Goes live") tabs.push("Going live");
  if (item.status.label === "Expires" || item.status.label === "Expires today") tabs.push("Expiring");
  if (item.hasConflict) tabs.push("Conflicts");
  return tabs;
}

export function ContentCalendarPage() {
  const [tab, setTab] = useState(TABS[0] as string);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");
  const setStage = useSetContentStage();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const canEdit = can("cms-cal", "edit");

  const { data: apiContent, isError: calError, refetch: refetchCal } = useContentCalendar();
  const allContent = apiContent ?? [];

  if (calError) {
    return (
      <div className={styles.wrap}>
        <ErrorState message="Couldn't load content calendar." onRetry={() => refetchCal()} />
      </div>
    );
  }

  function runCalendarAction(action: string, item: ScheduledContent) {
    const stageForAction = (a: string): ContentStage | null => {
      if (a === "Schedule publish" || a === "Reschedule") return "Scheduled";
      if (a === "Unpublish") return "Archived";
      return null;
    };
    const stage = stageForAction(action);
    if (!stage) {
      pushToast(
        action === "Resolve slot clash"
          ? `No clash resolver API — mark conflict manually for ${item.title}`
          : `${action} is not available yet`,
        "info"
      );
      return;
    }
    setStage.mutate(
      { id: item.id, stage },
      {
        onSuccess: () => pushToast(`${action}: ${item.title} → ${stage}`, "success"),
        onError: (e) => pushToast((e as Error).message || `Couldn't ${action.toLowerCase()}`, "error"),
      }
    );
  }

  const filtered = useMemo(
    () => allContent.filter((c) => tabsFor(c).includes(tab)),
    [tab, allContent]
  );

  const byDate = useMemo(() => {
    const groups = new Map<string, typeof filtered>();
    for (const item of filtered) {
      const list = groups.get(item.date) ?? [];
      list.push(item);
      groups.set(item.date, list);
    }
    return groups;
  }, [filtered]);

  const goingLive = allContent.filter((c) => c.status.label === "Goes live").length;
  const expiring = allContent.filter((c) => c.status.label.startsWith("Expires")).length;
  const conflicts = allContent.filter((c) => c.hasConflict).length;
  const surfacesAffected = new Set(allContent.map((c) => c.surface)).size;

  const selected = allContent.find((c) => c.id === selectedId);

  if (selected) {
    const primary = selected.hasConflict ? "Resolve slot clash" : "Schedule publish";
    const secondary = CAL_ACTIONS.filter((a) => a !== primary);
    const at = ladderIndexFor(selected.status.label);
    const isHero = /hero|banner/i.test(selected.type);

    return (
      <div className={styles.wrap}>
        <button type="button" className={styles.backLink} onClick={() => setSelectedId(undefined)}>
          ← Back to library
        </button>

        <div className={styles.detailBoard}>
          <div className={styles.editorCol}>
            <Card className={styles.editorCard}>
              <div className={styles.editorTop}>
                <span className={styles.editorLabel}>Content editor</span>
                <Badge label={selected.status.label} tone={selected.status.tone} />
              </div>

              <div className={styles.fieldLabel}>Title</div>
              <input className={styles.titleInput} defaultValue={selected.title} readOnly={!canEdit} />

              <div className={styles.fieldLabel}>Body</div>
              <textarea
                className={styles.bodyInput}
                readOnly={!canEdit}
                defaultValue="Body copy and imagery for this item render here exactly as the customer app lays them out."
              />

              {canEdit ? (
                <div className={styles.editorActions}>
                  <button
                    type="button"
                    className={styles.primaryActionBtn}
                    disabled={setStage.isPending}
                    onClick={() => runCalendarAction(primary, selected)}
                  >
                    {primary}
                  </button>
                  {secondary.map((a) => (
                    <button
                      key={a}
                      type="button"
                      className={styles.secondaryActionBtn}
                      disabled={setStage.isPending}
                      onClick={() => runCalendarAction(a, selected)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              ) : null}
            </Card>

            <Card className={styles.ladderCard}>
              <div className={styles.ladderTitle}>Publishing ladder</div>
              <div className={styles.ladderRow}>
                {LADDER.map((step, i) => (
                  <div key={step} className={styles.ladderStep}>
                    <div className={styles.ladderStepInner}>
                      <span
                        className={styles.ladderBadge}
                        style={{
                          background: i < at ? "var(--brand)" : i === at ? "var(--amber-tx)" : "var(--soft)",
                          color: i <= at ? "#fff" : "var(--mu)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <div className={styles.ladderName}>{step}</div>
                    </div>
                    {i < LADDER.length - 1 ? <span className={styles.ladderArrow}>›</span> : null}
                  </div>
                ))}
              </div>
              <div className={styles.ladderNext}>
                {FLOW_AT < FLOW.length - 1
                  ? `Next: ${FLOW[FLOW_AT + 1]!.label} · ${FLOW[FLOW_AT + 1]!.actor}`
                  : "This is the final stage"}
              </div>
            </Card>
          </div>

          <div className={styles.previewCol}>
            <div className={styles.editorLabel}>Customer app preview</div>
            <div className={styles.phone}>
              <div className={styles.phoneNotch}>
                <div className={styles.phoneNotchPill} />
              </div>
              <div className={styles.phoneScreen}>
                {isHero ? (
                  <div className={styles.previewHero}>
                    <div className={styles.previewHeroTitle}>{selected.title}</div>
                    <div className={styles.previewHeroKind}>{selected.type}</div>
                  </div>
                ) : (
                  <div className={styles.previewText}>
                    <div className={styles.previewTextTitle}>{selected.title}</div>
                    <div className={styles.previewTextBody}>
                      Body copy and imagery for this item render here exactly as the customer app lays them out.
                    </div>
                  </div>
                )}
                <div className={styles.previewFiller}>
                  <div className={styles.previewFillerLine} />
                  <div className={styles.previewFillerRow}>
                    <div className={styles.previewFillerBlock} />
                    <div className={styles.previewFillerBlock} />
                    <div className={styles.previewFillerBlock} />
                  </div>
                  <div className={styles.previewFillerLine2} />
                  <div className={styles.previewFillerTall} />
                </div>
              </div>
            </div>
            <div className={styles.previewCaption}>Surrounding sections shown greyed for context</div>
          </div>

          <Card className={styles.propsCol}>
            <div className={styles.propsTitle}>Properties</div>
            <div className={styles.propsList}>
              <div>
                <div className={styles.propLabel}>Type</div>
                <div className={styles.propValue}>{selected.type}</div>
              </div>
              <div>
                <div className={styles.propLabel}>Surface</div>
                <div className={styles.propValue}>{selected.surface}</div>
              </div>
              <div>
                <div className={styles.propLabel}>Placement</div>
                <div className={styles.propValue}>{selected.placement}</div>
              </div>
              <div>
                <div className={styles.propLabel}>Date</div>
                <div className={styles.propValue}>{selected.date}</div>
              </div>
              <div>
                <div className={styles.propLabel}>Time</div>
                <div className={styles.propValue}>{selected.time}</div>
              </div>
              <div>
                <div className={styles.propLabel}>Owner</div>
                <div className={styles.propValue}>{selected.owner}</div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.hintCard}>
        <p className={styles.hint}>What goes live, and what comes down, across the next two weeks.</p>
      </Card>

      <KpiStrip
        moduleId="cms-cal"
        kpis={[
          { value: String(allContent.length), label: "Scheduled" },
          { value: String(goingLive), label: "Going live" },
          { value: String(expiring), label: "Expiring", color: expiring ? "var(--red-tx)" : undefined },
          { value: "4", label: "Next 7 days" },
          { value: String(conflicts), label: "Conflicts", color: conflicts ? "var(--amber-tx)" : undefined },
          { value: String(surfacesAffected), label: "Surfaces affected" },
        ]}
      />

      <Card className={styles.flowCard}>
        <FlowStrip flow={FLOW} activeIndex={FLOW_AT} />
      </Card>

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
          columns={["Content", "Type", "Surface", "Placement", "Date", "Time", "Owner", "Status"]}
          rows={filtered.map(
            (item): WorkspaceRow => [
              item.title,
              item.type,
              item.surface,
              item.placement,
              item.date,
              item.time,
              item.owner,
              item.status,
            ]
          )}
          onRowClick={(i) => {
            setSelectedId(filtered[i]!.id);
            setView("workspace");
          }}
        />
      ) : (
        <div className={styles.timeline}>
          {Array.from(byDate.entries()).map(([date, items]) => (
            <div key={date} className={styles.dateGroup}>
              <div className={styles.dateLabel}>{date}</div>
              <div className={styles.dateItems}>
                {items.map((item: ScheduledContent) => (
                  <Card key={item.id} className={styles.item} data-conflict={item.hasConflict}>
                    <button type="button" className={styles.itemBtn} onClick={() => setSelectedId(item.id)}>
                      <div className={styles.itemTop}>
                        <span className={styles.itemTime}>{item.time}</span>
                        <Badge label={item.status.label} tone={item.status.tone} />
                      </div>
                      <div className={styles.itemTitle}>{item.title}</div>
                      <div className={styles.itemMeta}>
                        {item.type} · {item.surface} · {item.placement}
                      </div>
                      <div className={styles.itemOwner}>{item.owner}</div>
                    </button>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
