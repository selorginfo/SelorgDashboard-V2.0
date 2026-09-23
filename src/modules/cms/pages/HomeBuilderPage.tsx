import { useEffect, useMemo, useState } from "react";
import {
  useHomeSections,
  useSetSectionEnabled,
  useCreateHomeSection,
  useMoveSection,
  useBindHomeSectionContent,
  usePreviewHome,
  usePublishHomeSection,
} from "@/modules/cms/hooks/useHomeSections";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { HomeSection } from "@/types/homeSection";
import type { WorkspaceRow } from "@/types/common";
import styles from "./HomeBuilderPage.module.css";

const SURFACES: HomeSection["surface"][] = ["Customer app home", "Web app home"];

const FLOW = ["Section added", "Content bound", "Previewed", "Approved", "Live on home"].map((label) => ({
  label,
  actor: "",
}));
const FLOW_AT = 3;

const PALETTE = [
  "Hero banner",
  "Strip banner",
  "Category carousel",
  "Product carousel",
  "Collection",
  "Promotional card",
  "Content block",
  "Announcement",
  "Image",
  "Text",
];

const DETAIL_ACTIONS = [
  "Bind content",
  "Reorder section",
  "Enable section",
  "Disable section",
  "Preview on device",
  "Approve content",
  "Publish now",
];

function previewKind(component: string): "hero" | "carousel" | "strip" | "block" {
  if (/hero/i.test(component)) return "hero";
  if (/carousel|collection/i.test(component)) return "carousel";
  if (/strip|announcement|promotional/i.test(component)) return "strip";
  return "block";
}

export function HomeBuilderPage() {
  const { data: sections, isLoading, isError, refetch } = useHomeSections();
  const createSection = useCreateHomeSection();
  const moveSection = useMoveSection();
  const bindContent = useBindHomeSectionContent();
  const previewHome = usePreviewHome();
  const publishSection = usePublishHomeSection();
  const [surface, setSurface] = useState<HomeSection["surface"]>(SURFACES[0] as HomeSection["surface"]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");
  const setEnabled = useSetSectionEnabled();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const ordered = useMemo(
    () => (sections ?? []).filter((s) => s.surface === surface).sort((a, b) => a.order - b.order),
    [sections, surface]
  );
  const previewSections = useMemo(
    () => ordered.filter((s) => s.status?.label !== "Disabled" && s.status?.label !== "Draft"),
    [ordered]
  );

  useEffect(() => {
    if (ordered.length > 0 && !ordered.some((s) => s.id === selectedId)) setSelectedId(ordered[0]!.id);
  }, [ordered, selectedId]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !sections) return <ErrorState message="Couldn't load home sections." onRetry={() => refetch()} />;

  const enabled = sections.filter((s) => s.status?.label === "Enabled").length;
  const disabled = sections.filter((s) => s.status?.label === "Disabled").length;
  const pending = sections.filter((s) => s.status?.label === "Pending approval").length;
  const canEdit = can("cms-home", "edit");
  const selected = ordered.find((s) => s.id === selectedId) ?? ordered[0];
  const isWeb = surface === "Web app home";

  function runDetailAction(label: string, section: HomeSection) {
    if (label === "Enable section" || label === "Disable section") {
      const wantEnabled = label === "Enable section";
      setEnabled.mutate(
        { id: section.id, enabled: wantEnabled },
        {
          onSuccess: () => pushToast(`${section.section} ${wantEnabled ? "enabled" : "disabled"}`, "success"),
          onError: (e) => pushToast((e as Error).message || "Couldn't update section", "error"),
        }
      );
      return;
    }
    if (label === "Reorder section") {
      moveSection.mutate(
        { id: section.id, direction: "up" },
        {
          onSuccess: () => pushToast(`${section.section} moved up`, "success"),
          onError: (e) => pushToast((e as Error).message || "Couldn't reorder", "error"),
        }
      );
      return;
    }
    if (label === "Bind content") {
      const raw = window.prompt("Product IDs (comma-separated ObjectIds)", "") ?? "";
      const productIds = raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (productIds.length === 0) {
        pushToast("Enter at least one product id", "info");
        return;
      }
      bindContent.mutate(
        { id: section.id, productIds },
        {
          onSuccess: () => pushToast(`Bound ${productIds.length} product(s) to ${section.section}`, "success"),
          onError: (e) => pushToast((e as Error).message || "Couldn't bind content", "error"),
        }
      );
      return;
    }
    if (label === "Preview on device") {
      previewHome.mutate(undefined, {
        onSuccess: () => pushToast("Home preview loaded from API", "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't load preview", "error"),
      });
      return;
    }
    if (label === "Approve content" || label === "Publish now") {
      publishSection.mutate(section.id, {
        onSuccess: () => pushToast(`${section.section} published live`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't publish section", "error"),
      });
      return;
    }
    pushToast(`${label} is not available for ${section.section}`, "info");
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.hintCard}>
        <p className={styles.hint}>
          Compose the customer app home screen section by section, then preview it before publishing.
        </p>
      </Card>

      <KpiStrip
        moduleId="cms-home"
        kpis={[
          { value: String(sections.length), label: "Home sections" },
          { value: String(enabled), label: "Enabled" },
          { value: String(disabled), label: "Disabled" },
          { value: String(pending), label: "Pending approval", color: pending ? "var(--amber-tx)" : undefined },
          { value: "3", label: "Scheduled changes" },
          { value: "v14", label: "Live version" },
        ]}
      />

      <Card className={styles.flowCard}>
        <FlowStrip flow={FLOW} activeIndex={FLOW_AT} />
      </Card>

      <div className={styles.tabs}>
        {SURFACES.map((s) => (
          <button
            key={s}
            type="button"
            className={styles.tabChip}
            data-active={s === surface}
            onClick={() => {
              setSurface(s);
              setSelectedId(undefined);
            }}
          >
            {s}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <RecordsListTable
          columns={["Section", "Component", "Bound content", "Surface", "Author", "Order", "Updated", "Status"]}
          rows={ordered.map(
            (s): WorkspaceRow => [
              s.section,
              s.component,
              s.boundContent,
              s.surface,
              s.author,
              String(s.order),
              s.updated,
              s.status,
            ]
          )}
          onRowClick={(i) => {
            setSelectedId(ordered[i]!.id);
            setView("workspace");
          }}
        />
      ) : (
      <div className={styles.board}>
        <div className={styles.leftCol}>
          <Card className={styles.paletteCard}>
            <div className={styles.cardLabel}>Add a component</div>
            <div className={styles.palette}>
              {PALETTE.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={styles.paletteItem}
                  disabled={!canEdit || createSection.isPending}
                  onClick={() => {
                    const nextOrder = ordered.length ? Math.max(...ordered.map((s) => s.order)) + 1 : 1;
                    createSection.mutate(
                      { section: name, component: name, surface, order: nextOrder },
                      {
                        onSuccess: (s) => {
                          pushToast(`${s.section} added — bind its content to finish`, "success");
                          setSelectedId(s.id);
                        },
                        onError: (e) => pushToast((e as Error).message || "Couldn't add section", "error"),
                      }
                    );
                  }}
                >
                  <span className={styles.paletteItemPlus}>+</span>
                  {name}
                </button>
              ))}
            </div>
          </Card>

          <Card className={styles.sectionsCard}>
            <div className={styles.cardLabel}>Sections in order</div>
            <div className={styles.sectionsList}>
              {ordered.map((section, i) => (
                <button
                  key={section.id}
                  type="button"
                  className={styles.sectionRow}
                  data-selected={section.id === selected?.id}
                  onClick={() => setSelectedId(section.id)}
                >
                  <span className={styles.sectionOrder}>{i + 1}</span>
                  <span className={styles.sectionName}>{section.section}</span>
                  <span className={styles.sectionDot} data-on={section.status?.label !== "Disabled"} />
                </button>
              ))}
            </div>
          </Card>
        </div>

        <div className={styles.previewCol}>
          <div className={styles.cardLabel}>Live preview</div>
          <div className={styles.phone}>
            <div className={styles.phoneNotch}>
              <div className={styles.phoneNotchPill} />
            </div>
            <div className={styles.phoneScreen}>
              <div className={styles.phoneHeader}>
                <div>
                  <div className={styles.phoneHeaderLabel}>Deliver to</div>
                  <div className={styles.phoneHeaderValue}>Indiranagar · 8 min</div>
                </div>
                <div className={styles.phoneHeaderAvatar}>PN</div>
              </div>
              <div className={styles.phoneBody}>
                {previewSections.map((section, idx) => {
                  const kind = previewKind(section.component);
                  const key = `${section.id}-${kind}-${idx}`;
                  if (kind === "strip") {
                    return (
                      <div key={key} className={styles.previewStrip}>
                        <div className={styles.previewStripName}>{section.section}</div>
                        <div className={styles.previewStripBound}>{section.boundContent}</div>
                      </div>
                    );
                  }
                  if (kind === "hero") {
                    return (
                      <div key={key} className={styles.previewHero}>
                        <div className={styles.previewHeroName}>{section.section}</div>
                        <div className={styles.previewHeroBound}>{section.boundContent}</div>
                      </div>
                    );
                  }
                  if (kind === "carousel") {
                    return (
                      <div key={key}>
                        <div className={styles.previewCarouselName}>{section.section}</div>
                        <div className={styles.previewCarouselTiles}>
                          {[0, 1, 2, 3].map((t) => (
                            <div key={t} className={styles.previewTile}>
                              <div className={styles.previewTileBox} />
                              <div className={styles.previewTileLine} />
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className={styles.previewBlock}>
                      <div className={styles.previewBlockName}>{section.section}</div>
                      <div className={styles.previewBlockLine1} />
                      <div className={styles.previewBlockLine2} />
                      <div className={styles.previewBlockBound}>{section.boundContent}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          <div className={styles.previewCaption}>
            {isWeb ? "Mobile web · same sections render wider on desktop" : "iPhone 14 · Customer app · disabled sections hidden"}
          </div>
        </div>

        {selected ? (
          <Card className={styles.detailCol}>
            <div className={styles.cardLabel}>Selected section</div>
            <div className={styles.detailName}>{selected.section}</div>
            <div className={styles.fieldsList}>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Component</span>
                <span className={styles.fieldValue}>{selected.component}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Bound content</span>
                <span className={styles.fieldValue}>{selected.boundContent}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Surface</span>
                <span className={styles.fieldValue}>{selected.surface.replace(/ home$/, "")}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Author</span>
                <span className={styles.fieldValue}>{selected.author}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Order</span>
                <span className={styles.fieldValue}>{selected.order}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Updated</span>
                <span className={styles.fieldValue}>{selected.updated}</span>
              </div>
              <div className={styles.fieldRow}>
                <span className={styles.fieldLabel}>Status</span>
                <span className={styles.fieldValue}>{selected.status?.label}</span>
              </div>
            </div>

            {canEdit ? (
              <div className={styles.detailActions}>
                {DETAIL_ACTIONS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    className={styles.detailActionBtn}
                    data-primary={/publish|approve/i.test(label)}
                    onClick={() => runDetailAction(label, selected)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : null}
          </Card>
        ) : null}
      </div>
      )}
    </div>
  );
}
