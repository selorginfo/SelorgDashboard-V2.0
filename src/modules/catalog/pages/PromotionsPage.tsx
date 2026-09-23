import { useState } from "react";
import { Pause, Play, Plus } from "lucide-react";
import {
  useCoupons,
  usePromoCampaigns,
  useBanners,
  usePromoAnalytics,
  useSetCampaignStatus,
  useCreateCampaign,
} from "@/modules/catalog/hooks/usePromotions";
import { COMMERCE_CONFIGS } from "@/services/workspace/data/commerce";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { PromoCard, PromoKind } from "@/types/promotions";
import type { WorkspaceCell, WorkspaceRow } from "@/types/common";
import styles from "./PromotionsPage.module.css";

const CONFIG = COMMERCE_CONFIGS.promotions;
const TABS = CONFIG?.tabs ?? [];
const ANALYTICS_COLUMNS = CONFIG?.columns ?? [];

const TOGGLEABLE_STATUSES = ["Live", "Scheduled", "Paused"];

function parseUsage(label: string | undefined): { used: number; total: number } | null {
  if (!label) return null;
  const m = label.match(/^([\d,]+)\s*\/\s*([\d,]+)$/);
  if (!m) return null;
  const used = Number(m[1]!.replace(/,/g, ""));
  const total = Number(m[2]!.replace(/,/g, ""));
  if (!Number.isFinite(used) || !Number.isFinite(total) || total <= 0) return null;
  return { used, total };
}

function promoToRow(card: PromoCard): WorkspaceRow {
  return [card.code, card.type, card.scope, card.value, card.minOrder, card.usage, card.window, card.status];
}

function renderCell(cell: WorkspaceCell) {
  if (typeof cell === "string") return cell;
  return <Badge label={cell.label} tone={cell.tone} />;
}

function CampaignGrid({
  kind,
  cards,
  canEdit,
  pendingCode,
  onToggle,
}: {
  kind: PromoKind;
  cards: PromoCard[];
  canEdit: boolean;
  pendingCode: string | undefined;
  onToggle: (card: PromoCard) => void;
}) {
  if (cards.length === 0) {
    return <EmptyState title={`No ${kind === "coupon" ? "coupons" : "promotions"} yet`} />;
  }
  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const usage = parseUsage(card.usage);
        const canToggle = TOGGLEABLE_STATUSES.includes(card.status?.label ?? "");
        const isLive = card.status?.label === "Live";
        return (
          <Card key={card.code} className={styles.card}>
            <div className={styles.cardTop}>
              <span className={styles.code}>{card.code}</span>
              <Badge label={card.status?.label} tone={card.status?.tone} />
            </div>
            <div className={styles.meta}>
              {card.type} · {card.scope}
            </div>

            <div className={styles.valueRow}>
              <div className={styles.valueCell}>
                <span className={styles.valueNum}>{card.value}</span>
                <span className={styles.valueLabel}>Value</span>
              </div>
              <div className={styles.valueCell}>
                <span className={styles.valueNum}>{card.minOrder}</span>
                <span className={styles.valueLabel}>Min order</span>
              </div>
            </div>

            <div className={styles.usageBlock}>
              {usage ? (
                <>
                  <div className={styles.usageBar}>
                    <div
                      className={styles.usageFill}
                      style={{ width: `${Math.min(100, (usage.used / usage.total) * 100)}%` }}
                    />
                  </div>
                  <div className={styles.usageLabel}>{card.usage} used</div>
                </>
              ) : (
                <div className={styles.usageLabel}>{card.usage}</div>
              )}
            </div>

            <div className={styles.window}>{card.window}</div>

            {canEdit && canToggle ? (
              <div className={styles.actionRow}>
                <Button
                  size="sm"
                  variant={isLive ? "secondary" : "primary"}
                  isLoading={pendingCode === card.code}
                  onClick={() => onToggle(card)}
                >
                  {isLive ? <Pause size={13} /> : <Play size={13} />}
                  {isLive ? "Pause" : "Activate"}
                </Button>
              </div>
            ) : null}
          </Card>
        );
      })}
    </div>
  );
}

export function PromotionsPage() {
  const [tab, setTab] = useState(TABS[0] ?? "Coupons");
  const [pendingCode, setPendingCode] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");

  const { data: coupons, isLoading: couponsLoading, isError: couponsError, refetch: refetchCoupons } = useCoupons();
  const {
    data: promotions,
    isLoading: promotionsLoading,
    isError: promotionsError,
    refetch: refetchPromotions,
  } = usePromoCampaigns();
  const { data: banners, isLoading: bannersLoading, isError: bannersError, refetch: refetchBanners } = useBanners();
  const {
    data: analytics,
    isLoading: analyticsLoading,
    isError: analyticsError,
    refetch: refetchAnalytics,
  } = usePromoAnalytics();

  const setStatus = useSetCampaignStatus();
  const createCampaign = useCreateCampaign();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const canEdit = can("promotions", "edit");

  function toggle(card: PromoCard) {
    const action = card.status?.label === "Live" ? "pause" : "activate";
    setPendingCode(card.code);
    setStatus.mutate(
      { kind: card.kind, code: card.code, action, id: card.id },
      {
        onSuccess: () => pushToast(`${card.code} ${action === "pause" ? "paused" : "activated"}`, "success"),
        onError: () => pushToast("Couldn't update campaign status", "error"),
        onSettled: () => setPendingCode(undefined),
      }
    );
  }

  function onCreateCampaign() {
    createCampaign.mutate(
      {},
      {
        onSuccess: (card) => pushToast(`Campaign ${card.code} created`, "success"),
        onError: () => pushToast("Couldn't create campaign", "error"),
      }
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="promotions" />

      <KpiStrip
        moduleId="promotions"
        kpis={[
          {
            value: String((coupons ?? []).filter((c) => c.status?.label === "Live").length),
            label: "Active coupons",
          },
          {
            value: String((promotions ?? []).filter((c) => c.status?.label === "Live").length),
            label: "Live promotions",
          },
          {
            value: String((coupons ?? []).filter((c) => c.status?.label === "Scheduled").length),
            label: "Scheduled",
          },
          {
            value: String((banners ?? []).filter((b) => b.status?.label === "Live").length),
            label: "Banners live",
          },
          { value: String((coupons ?? []).length), label: "Total coupons" },
          { value: String((analytics ?? []).length), label: "Analytics rows" },
        ]}
      />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        {(tab === "Coupons" || tab === "Promotions") && <ViewToggle view={view} onChange={setView} />}
        {canEdit ? (
          <Button
            size="sm"
            variant="primary"
            isLoading={createCampaign.isPending}
            onClick={onCreateCampaign}
            title="Creates an active coupon via merch pricing API"
          >
            <Plus size={13} /> New campaign
          </Button>
        ) : null}
      </div>

      {tab === "Coupons" ? (
        couponsLoading ? (
          <CardSkeleton />
        ) : couponsError || !coupons ? (
          <ErrorState message="Couldn't load coupons." onRetry={() => refetchCoupons()} />
        ) : view === "list" ? (
          <RecordsListTable columns={CONFIG?.columns ?? []} rows={coupons.map(promoToRow)} />
        ) : (
          <CampaignGrid kind="coupon" cards={coupons} canEdit={canEdit} pendingCode={pendingCode} onToggle={toggle} />
        )
      ) : null}

      {tab === "Promotions" ? (
        promotionsLoading ? (
          <CardSkeleton />
        ) : promotionsError || !promotions ? (
          <ErrorState message="Couldn't load promotions." onRetry={() => refetchPromotions()} />
        ) : view === "list" ? (
          <RecordsListTable columns={CONFIG?.columns ?? []} rows={promotions.map(promoToRow)} />
        ) : (
          <CampaignGrid
            kind="promotion"
            cards={promotions}
            canEdit={canEdit}
            pendingCode={pendingCode}
            onToggle={toggle}
          />
        )
      ) : null}

      {tab === "Banners" ? (
        bannersLoading ? (
          <CardSkeleton />
        ) : bannersError || !banners ? (
          <ErrorState message="Couldn't load banners." onRetry={() => refetchBanners()} />
        ) : banners.length === 0 ? (
          <EmptyState title="No banners scheduled" />
        ) : (
          <div className={styles.bannerList}>
            {banners.map((banner, i) => (
              <Card key={`${banner.name}-${i}`} className={styles.bannerRow}>
                <div className={styles.bannerName}>{banner.name}</div>
                <div className={styles.bannerField}>
                  <span className={styles.fieldLabel}>Slot</span>
                  <span className={styles.fieldValue}>{banner.slot}</span>
                </div>
                <div className={styles.bannerField}>
                  <span className={styles.fieldLabel}>Views</span>
                  <span className={styles.fieldValue}>{banner.views}</span>
                </div>
                <div className={styles.bannerField}>
                  <span className={styles.fieldLabel}>Window</span>
                  <span className={styles.fieldValue}>{banner.window}</span>
                </div>
                <Badge label={banner.status?.label} tone={banner.status?.tone} />
              </Card>
            ))}
          </div>
        )
      ) : null}

      {tab === "Analytics" ? (
        analyticsLoading ? (
          <CardSkeleton />
        ) : analyticsError || !analytics ? (
          <ErrorState message="Couldn't load analytics." onRetry={() => refetchAnalytics()} />
        ) : analytics.length === 0 ? (
          <EmptyState title="No analytics yet" />
        ) : (
          <Card className={styles.tableCard}>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {ANALYTICS_COLUMNS.map((c) => (
                      <th key={c}>{c}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {analytics.map((row, i) => {
                    const cells = Array.isArray(row) ? row : [];
                    return (
                      <tr key={i}>
                        {cells.map((cell, j) => (
                          <td key={j} className={j === 0 ? styles.mono : undefined}>
                            {renderCell(cell)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : null}
    </div>
  );
}
