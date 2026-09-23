import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { useContentItems, useSetContentStage, useCreateContentItem } from "@/modules/cms/hooks/useContent";
import { CONTENT_STAGES, CONTENT_SURFACES } from "@/types/contentItem";
import type { ContentItem, ContentStage, ContentSurface } from "@/types/contentItem";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { Tone, WorkspaceRow } from "@/types/common";
import styles from "./ContentPipelinePage.module.css";

const FLOW = ["Draft", "In review", "Approved", "Scheduled", "Published", "Live monitored", "Archived"].map(
  (label) => ({ label, actor: "" })
);
const FLOW_AT = 4;

const SURFACE_INI: Record<ContentSurface, string> = {
  "Customer app": "CA",
  "Picker app": "PK",
  "Rider app": "RD",
  "HSD scanner": "HSD",
  "Web app": "WEB",
  "Shared media": "MED",
};

const SURFACE_NOTES: Record<ContentSurface, string> = {
  "Customer app": "Home surfaces, banners and campaign content shown to shoppers.",
  "Picker app": "Guidance, tips and announcements shown to in-store pickers.",
  "Rider app": "Delivery instructions and announcements shown to riders.",
  "HSD scanner": "Prompts and messages shown on the handheld scanner device.",
  "Web app": "Marketing and landing-page content for the web storefront.",
  "Shared media": "Assets reused across two or more of the surfaces above.",
};

const STAGE_TONE: Record<ContentStage, Tone> = {
  Draft: "grey",
  "In review": "amber",
  Approved: "blue",
  Scheduled: "blue",
  Published: "green",
  Archived: "grey",
};

/** The pipeline board itself only ever shows 5 lanes — Approved has no lane of its own here
 * (dc.html:8606's LANES array), so an item mid-approval renders in the Draft lane until it's
 * scheduled. The 7-step PurposeBanner flow above still shows Approved as its own milestone. */
const LANES: ContentStage[] = ["Draft", "In review", "Scheduled", "Published", "Archived"];
function laneFor(stage: ContentStage): ContentStage {
  return stage === "Approved" ? "Draft" : stage;
}

function initialsFor(title: string): string {
  return title
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ContentPipelinePage() {
  const { data: items, isLoading, isError, refetch } = useContentItems();
  const createItem = useCreateContentItem();
  const [surface, setSurface] = useState<ContentSurface>(CONTENT_SURFACES[0]);
  const [type, setType] = useState<string>("All types");
  const [view, setView] = useState<ViewMode>("workspace");
  const setStage = useSetContentStage();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const bySurface = useMemo(() => (items ?? []).filter((c) => c.surface === surface), [items, surface]);
  const types = useMemo(() => ["All types", ...Array.from(new Set(bySurface.map((c) => c.type)))], [bySurface]);
  const filtered = useMemo(
    () => (type === "All types" ? bySurface : bySurface.filter((c) => c.type === type)),
    [bySurface, type]
  );
  const columns = useMemo(() => {
    const map = new Map<ContentStage, ContentItem[]>(LANES.map((s) => [s, []]));
    for (const item of filtered) map.get(laneFor(item.stage))?.push(item);
    return map;
  }, [filtered]);
  const surfaceCounts = useMemo(() => {
    const counts = new Map<ContentSurface, number>();
    for (const item of items ?? []) counts.set(item.surface, (counts.get(item.surface) ?? 0) + 1);
    return counts;
  }, [items]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !items) return <ErrorState message="Couldn't load content." onRetry={() => refetch()} />;

  const live = items.filter((c) => c.stage === "Published").length;
  const inReview = items.filter((c) => c.stage === "In review").length;
  const scheduled = items.filter((c) => c.stage === "Scheduled").length;
  const canEdit = can("cms", "edit");

  function advance(item: ContentItem) {
    const idx = CONTENT_STAGES.indexOf(item.stage);
    const next = CONTENT_STAGES[idx + 1];
    if (!next) return;
    setStage.mutate(
      { id: item.id, stage: next },
      { onSuccess: () => pushToast(`${item.title} → ${next}`, "success") }
    );
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.hintCard}>
        <p className={styles.hint}>
          One content pipeline for all five Selorg surfaces — pick a surface, then move each item Draft → In review →
          Approved → Scheduled → Published → Archived.
        </p>
      </Card>

      <KpiStrip
        moduleId="cms"
        kpis={[
          { value: String(items.length), label: "Content items" },
          { value: String(live), label: "Live now" },
          { value: String(inReview), label: "In review", color: inReview ? "var(--amber-tx)" : undefined },
          { value: String(scheduled), label: "Scheduled" },
          {
            value: String(
              items.filter((c) => {
                if (!c.schedule || c.schedule === "—") return false;
                const d = new Date(c.schedule);
                if (Number.isNaN(d.getTime())) return false;
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length
            ),
            label: "Expiring today",
            color: undefined,
          },
          { value: String(CONTENT_SURFACES.length), label: "Surfaces" },
        ]}
      />

      <Card className={styles.flowCard}>
        <FlowStrip flow={FLOW} activeIndex={FLOW_AT} />
      </Card>

      <div className={styles.board}>
        <Card className={styles.surfacesCard}>
          <div className={styles.surfacesTitle}>Surfaces</div>
          <div className={styles.surfaceList}>
            {CONTENT_SURFACES.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.surfaceRow}
                data-active={s === surface}
                onClick={() => {
                  setSurface(s);
                  setType("All types");
                }}
              >
                <span className={styles.surfaceIni}>{SURFACE_INI[s]}</span>
                <span className={styles.surfaceBody}>
                  <span className={styles.surfaceName}>{s}</span>
                  <span className={styles.surfaceLive}>
                    {(items.filter((i) => i.surface === s && i.stage === "Published").length)} live
                  </span>
                </span>
                <span className={styles.surfaceCount}>{surfaceCounts.get(s) ?? 0}</span>
              </button>
            ))}
          </div>

          <div className={styles.surfaceNote}>
            <div className={styles.surfaceNoteTitle}>{surface}</div>
            <div className={styles.surfaceNoteBody}>{SURFACE_NOTES[surface]}</div>
          </div>

          {canEdit ? (
            <button
              type="button"
              className={styles.createBtn}
              disabled={createItem.isPending}
              onClick={() => {
                createItem.mutate(
                  { title: `New ${surface} draft`, surface, type: type === "All types" ? "Page" : type },
                  {
                    onSuccess: (item) => pushToast(`${item.title} created`, "success"),
                    onError: (e) => pushToast((e as Error).message || "Couldn't create content item", "error"),
                  }
                );
              }}
            >
              + New content item
            </button>
          ) : null}
        </Card>

        <div className={styles.lanesCol}>
          <div className={styles.typeTabs}>
            <span className={styles.typeTabsLabel}>Type</span>
            {types.map((t) => (
              <button
                key={t}
                type="button"
                className={styles.typeChip}
                data-active={t === type}
                onClick={() => setType(t)}
              >
                {t}
              </button>
            ))}
            <div className={styles.typeTabsSpacer} />
            <ViewToggle view={view} onChange={setView} />
          </div>

          {view === "list" ? (
            <RecordsListTable
              columns={["Title", "Type", "Placement", "Surface", "Author", "Schedule", "Updated", "Status"]}
              rows={filtered.map(
                (item): WorkspaceRow => [
                  item.title,
                  item.type,
                  item.placement,
                  item.surface,
                  item.author,
                  item.schedule,
                  item.updated,
                  { label: item.stage, tone: STAGE_TONE[item.stage] },
                ]
              )}
            />
          ) : (
          <div className={styles.lanes}>
            {LANES.map((stage, i) => {
              const cards = columns.get(stage) ?? [];
              return (
                <div key={stage}>
                  <div className={styles.laneHeader}>
                    <span className={styles.laneStep}>{i + 1}</span>
                    <div className={styles.laneName}>{stage}</div>
                    <span className={styles.laneCount}>{cards.length}</span>
                  </div>

                  {cards.length > 0 ? (
                    <div className={styles.laneGrid}>
                      {cards.map((item) => {
                        const nextStage = CONTENT_STAGES[CONTENT_STAGES.indexOf(item.stage) + 1];
                        return (
                          <div key={`${item.id || "item"}-${item.stage}-${item.title}`} className={styles.laneCard}>
                            <div className={styles.laneCardTop}>
                              <div className={styles.laneCardIni}>{initialsFor(item.title)}</div>
                              <div className={styles.laneCardType}>{item.type}</div>
                            </div>
                            <div className={styles.laneCardBody}>
                              <div className={styles.laneCardTitle}>{item.title}</div>
                              <div className={styles.laneCardMeta}>
                                {item.placement} · {item.surface}
                              </div>
                              <div className={styles.laneCardBottom}>
                                <Badge label={item.stage} tone={STAGE_TONE[item.stage]} />
                                <div className={styles.laneCardWhen}>{item.schedule !== "—" ? item.schedule : item.updated}</div>
                              </div>
                              <div className={styles.laneCardAuthor}>
                                {item.author} · updated {item.updated}
                              </div>
                              {canEdit && nextStage ? (
                                <button type="button" className={styles.advanceBtn} onClick={() => advance(item)}>
                                  Advance to {nextStage} <ChevronRight size={12} />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={styles.laneEmpty}>Nothing at this stage.</div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
