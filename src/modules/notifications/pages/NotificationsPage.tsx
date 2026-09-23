import { useMemo, useState } from "react";
import { Send, Pause, Play } from "lucide-react";
import {
  useNotificationEntries,
  useDeliveryLog,
  useSetNotificationActive,
  useSendTest,
} from "@/modules/notifications/hooks/useNotifications";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { NotificationEntry } from "@/types/notificationRule";
import type { Badge as BadgeT, WorkspaceRow } from "@/types/common";
import styles from "./NotificationsPage.module.css";

const TABS = ["Templates", "Rules", "Channels", "Delivery log"];

const FLOW = ["Event", "Rule matched", "Template rendered", "Queued", "Sent", "Delivered", "Escalated"].map(
  (label) => ({ label, actor: "" })
);
const FLOW_AT = 4;

const COLS = ["Name", "Trigger", "Audience", "Channel", "Timing", "Sent 24h", "Delivery", "Status"];
const LIST_COLS = ["Name", "Trigger", "Audience", "Channel", "Timing", "Delivery", "Status"];

type Sev = "Critical" | "Warning" | "Information" | "Resolved";

const TILE_COLOR: Record<Sev, { c: string; bg: string }> = {
  Critical: { c: "var(--red-tx)", bg: "var(--red-bg)" },
  Warning: { c: "var(--amber-tx)", bg: "var(--amber-bg)" },
  Information: { c: "var(--blue-tx)", bg: "var(--blue-bg)" },
  Resolved: { c: "var(--brand)", bg: "var(--bsoft)" },
};

function sevOf(text: string): Sev {
  if (/critical|failed|breach|offline|error/i.test(text)) return "Critical";
  if (/warn|delay|pending|low|paused|watch|expir/i.test(text)) return "Warning";
  if (/resolved|closed|complete|sent|healthy|active/i.test(text)) return "Resolved";
  return "Information";
}

interface AlertRow {
  key: string;
  title: string;
  col1: string;
  col2: string;
  col3: string;
  col4: string;
  when: string;
  status: BadgeT;
  entry?: NotificationEntry;
}

export function NotificationsPage() {
  const { data: entries, isLoading, isError, refetch } = useNotificationEntries();
  const { data: log } = useDeliveryLog();
  const [tab, setTab] = useState(TABS[0] as string);
  const [view, setView] = useState<ViewMode>("workspace");
  const setActive = useSetNotificationActive();
  const sendTest = useSendTest();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const rows: AlertRow[] = useMemo(() => {
    if (tab === "Delivery log") {
      return (log ?? []).map((row, i) => {
        const status = row[row.length - 1];
        return {
          key: String(i),
          title: String(row[0]),
          col1: String(row[1]),
          col2: String(row[2]),
          col3: String(row[3]),
          col4: String(row[4]),
          when: String(row[6]),
          status: typeof status === "string" ? { label: status, tone: "grey" } : status!,
        };
      });
    }
    const kind = tab === "Templates" ? "template" : tab === "Rules" ? "rule" : "channel";
    return (entries ?? [])
      .filter((e) => e.kind === kind)
      .map((e) => ({
        key: e.id,
        title: e.name,
        col1: e.trigger,
        col2: e.audience,
        col3: e.channel,
        col4: e.timing,
        when: e.delivery,
        status: e.status,
        entry: e,
      }));
  }, [tab, entries, log]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !entries) return <ErrorState message="Couldn't load notifications." onRetry={() => refetch()} />;

  const canEdit = can("notifications", "edit");

  const tiles: { sev: Sev; count: number }[] = (["Critical", "Warning", "Information", "Resolved"] as Sev[]).map(
    (sev) => ({ sev, count: rows.filter((r) => sevOf(`${r.status.label} ${r.title}`) === sev).length })
  );

  function toggle(entry: NotificationEntry) {
    setActive.mutate(
      { id: entry.id, active: entry.status.label !== "Active" },
      { onSuccess: () => pushToast(`${entry.name} ${entry.status.label === "Active" ? "paused" : "activated"}`, "success") }
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="notifications" flow={FLOW} activeIndex={FLOW_AT} />

      <div className={styles.tiles}>
        {tiles.map((t) => (
          <div key={t.sev} className={styles.tile} style={{ background: TILE_COLOR[t.sev].bg }}>
            <div className={styles.tileCount} style={{ color: TILE_COLOR[t.sev].c }}>
              {t.count}
            </div>
            <div className={styles.tileLabel} style={{ color: TILE_COLOR[t.sev].c }}>
              {t.sev}
            </div>
          </div>
        ))}
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        <Button size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title={`No ${tab.toLowerCase()} configured`} />
      ) : view === "list" ? (
        <RecordsListTable
          columns={LIST_COLS}
          rows={rows.map((r): WorkspaceRow => [r.title, r.col1, r.col2, r.col3, r.col4, r.when, r.status])}
        />
      ) : (
        <div className={styles.list}>
          {rows.map((row) => {
            const sev = sevOf(`${row.status.label} ${row.title}`);
            return (
              <Card key={row.key} className={styles.item} style={{ borderLeftColor: TILE_COLOR[sev].c }}>
                <span className={styles.sevPill} style={{ background: TILE_COLOR[sev].bg, color: TILE_COLOR[sev].c }}>
                  {sev}
                </span>
                <div className={styles.itemBody}>
                  <div className={styles.itemTitle}>{row.title}</div>
                  <div className={styles.itemBodyLine}>
                    {COLS[1]}: {row.col1} · {COLS[2]}: {row.col2}
                  </div>
                  <div className={styles.itemMeta}>
                    {COLS[3]} {row.col3} · {COLS[4]} {row.col4}
                  </div>
                  {canEdit && row.entry && row.entry.kind !== "channel" ? (
                    <div className={styles.actionsRow}>
                      <Button size="sm" onClick={() => toggle(row.entry!)}>
                        {row.status.label === "Active" ? (
                          <>
                            <Pause size={12} /> Pause
                          </>
                        ) : (
                          <>
                            <Play size={12} /> Activate
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          pushToast(`${row.entry!.name} acknowledged — delivery rules unchanged`, "success")
                        }
                      >
                        Acknowledge
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          sendTest.mutate(row.entry!.id, {
                            onSuccess: () => pushToast(`Test sent for ${row.entry!.name}`, "success"),
                          })
                        }
                        isLoading={sendTest.isPending}
                      >
                        <Send size={12} /> Send test
                      </Button>
                    </div>
                  ) : canEdit ? (
                    <div className={styles.actionsRow}>
                      <Button
                        size="sm"
                        onClick={() => pushToast(`${row.title} acknowledged`, "success")}
                      >
                        Acknowledge
                      </Button>
                      <Button size="sm" onClick={() => refetch()}>
                        Refresh
                      </Button>
                    </div>
                  ) : null}
                </div>
                <div className={styles.itemRight}>
                  <Badge label={row.status.label} tone={row.status.tone} />
                  <div className={styles.itemWhen}>{row.when}</div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
