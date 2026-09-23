import { useState } from "react";
import { Send } from "lucide-react";
import {
  useCxTickets,
  useReplyToCxTicket,
  useSetCxTicketStatus,
  useAssignCxAgent,
  useRefundCxTicket,
} from "@/modules/commerce/hooks/useCxTickets";
import { COMMERCE_CONFIGS } from "@/services/workspace/data/commerce";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { CxTicket } from "@/types/commerce";
import styles from "./SupportPage.module.css";

const CONFIG = COMMERCE_CONFIGS.support;
const TABS = CONFIG?.tabs ?? [];
const RESOLVED_LABELS = new Set(["Resolved", "Refunded", "Replaced", "Closed"]);
const AGENTS = ["Latha S.", "Arjun P.", "Divya M.", "Nisha R."];

const RECENT_ACTIVITY = [
  { title: "Approved transfer TR-2293", meta: "Today 19:14 · Transfers" },
  { title: "Adjusted stock for SEL-2214 (-12)", meta: "Today 18:02 · Inventory" },
];

function isResolved(ticket: CxTicket) {
  return RESOLVED_LABELS.has(ticket.status.label);
}

function ticketMatchesTab(ticket: CxTicket, tab: string) {
  if (tab === "Escalations") return ticket.status.label === "Escalated" || ticket.status.label === "L2";
  if (tab === "Resolved") return isResolved(ticket);
  return !isResolved(ticket); // "Open tickets"
}

export function SupportPage() {
  const { data: tickets, isLoading, isError, refetch } = useCxTickets();
  const [tab, setTab] = useState(TABS[0] ?? "Open tickets");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [reply, setReply] = useState("");
  const replyMutation = useReplyToCxTicket();
  const setStatus = useSetCxTicketStatus();
  const assignAgent = useAssignCxAgent();
  const refundTicket = useRefundCxTicket();
  const pushToast = useUiStore((s) => s.pushToast);
  const { can } = usePermission();
  const canReply = can("support", "edit");
  const canAssign = can("support", "assign") || canReply;

  if (isLoading) return <CardSkeleton />;
  if (isError || !tickets) return <ErrorState message="Couldn't load tickets." onRetry={() => refetch()} />;

  const filtered = tickets.filter((t) => ticketMatchesTab(t, tab));
  const selected = tickets.find((t) => t.id === (selectedId ?? filtered[0]?.id));

  function sendReply() {
    if (!selected || !reply.trim()) return;
    replyMutation.mutate(
      { id: selected.id, text: reply },
      { onSuccess: () => setReply(""), onError: () => pushToast("Couldn't send reply", "error") }
    );
  }

  function changeStatus(label: string, tone: "green" | "amber" | "red" | "blue" | "grey") {
    if (!selected) return;
    setStatus.mutate(
      { id: selected.id, status: { label, tone } },
      { onSuccess: () => pushToast(`${selected.id} marked ${label}`, "success") }
    );
  }

  function issueRefund() {
    if (!selected || refundTicket.isPending) return;
    refundTicket.mutate(
      { id: selected.id },
      {
        onSuccess: () => pushToast(`Refund issued for ${selected.id}`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't issue the refund", "error"),
      }
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="support" />

      {CONFIG ? <KpiStrip kpis={CONFIG.kpis} moduleId="support" /> : null}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        {canReply ? (
          <Button
            variant="primary"
            size="sm"
            disabled
            title="Ticket creation is not available — the support service has no create-ticket endpoint yet. Use the customer/picker apps or backend admin tools."
          >
            + New ticket
          </Button>
        ) : null}
      </div>

      {tab === "CX analytics" ? (
        <div className={styles.statGrid}>
          {(CONFIG?.rows["CX analytics"] ?? []).map((row, i) => {
            const [label, , , value, delta, , , status] = row;
            const badge = typeof status === "string" ? undefined : status;
            return (
              <Card key={i} className={styles.statCard}>
                <div className={styles.statLabel}>{String(label)}</div>
                <div className={styles.statValue}>{String(value)}</div>
                <div className={styles.statFooter}>
                  <span className={styles.statDelta}>{String(delta)}</span>
                  {badge ? <Badge label={badge.label} tone={badge.tone} /> : null}
                </div>
              </Card>
            );
          })}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title={`No tickets in "${tab}"`} />
      ) : (
        <div className={styles.board}>
          <Card className={styles.queue}>
            {filtered.map((t) => (
              <button
                key={t.id}
                type="button"
                className={styles.queueRow}
                data-selected={t.id === selected?.id}
                onClick={() => setSelectedId(t.id)}
              >
                <div className={styles.queueTop}>
                  <span className={styles.queueId}>{t.id}</span>
                  <Badge label={t.status.label} tone={t.status.tone} />
                </div>
                <div className={styles.queuePerson}>{t.customer}</div>
                <div className={styles.queueIssue}>{t.issue}</div>
                <div className={styles.queueMeta}>
                  {t.order} · {t.channel} · {t.age}
                </div>
              </button>
            ))}
          </Card>

          {selected ? (
            <Card className={styles.detail}>
              <div className={styles.detailHeader}>
                <div>
                  <div className={styles.detailTitle}>{selected.issue}</div>
                  <div className={styles.detailMeta}>
                    {selected.id} · {selected.customer} · {selected.order}
                  </div>
                </div>
                <Badge label={selected.status.label} tone={selected.status.tone} />
              </div>

              <div className={styles.detailFields}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Channel</span>
                  <span className={styles.fieldValue}>{selected.channel}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Agent</span>
                  {canAssign ? (
                    <Select
                      value={selected.agent}
                      onValueChange={(v) =>
                        assignAgent.mutate(
                          { id: selected.id, agent: v },
                          { onSuccess: () => pushToast(`Assigned to ${v}`, "success") }
                        )
                      }
                      options={AGENTS.map((a) => ({ value: a, label: a }))}
                    />
                  ) : (
                    <span className={styles.fieldValue}>{selected.agent}</span>
                  )}
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Age</span>
                  <span className={styles.fieldValue}>{selected.age}</span>
                </div>
              </div>

              <div className={styles.thread}>
                {selected.thread.length === 0 ? (
                  <div className={styles.emptyThread}>No messages yet.</div>
                ) : (
                  selected.thread.map((m, i) => (
                    <div key={i} className={styles.message}>
                      <div className={styles.messageHead}>
                        <span className={styles.messageFrom}>{m.from}</span>
                        <span className={styles.messageTime}>{m.time}</span>
                      </div>
                      <div className={styles.messageText}>{m.text}</div>
                    </div>
                  ))
                )}
              </div>

              {canReply ? (
                <div className={styles.composer}>
                  <textarea
                    className={styles.composerInput}
                    placeholder={`Reply to ${selected.customer}`}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    rows={2}
                  />
                  <Button size="sm" variant="primary" onClick={sendReply} isLoading={replyMutation.isPending}>
                    <Send size={13} /> Reply
                  </Button>
                </div>
              ) : null}

              {canReply ? (
                <div className={styles.actionsRow}>
                  <Button size="sm" onClick={() => changeStatus("Escalated", "red")}>
                    Escalate
                  </Button>
                  {can("support", "refund") ? (
                    <Button size="sm" onClick={issueRefund} isLoading={refundTicket.isPending}>
                      Issue refund
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => changeStatus("Resolved", "green")}>
                    Resolve ticket
                  </Button>
                  <Button size="sm" onClick={() => changeStatus("Closed", "grey")}>
                    Close ticket
                  </Button>
                </div>
              ) : null}
            </Card>
          ) : null}

          {selected ? (
            <Card className={styles.activityCard}>
              <div className={styles.activityTitle}>Recent activity</div>
              <div className={styles.activityList}>
                {RECENT_ACTIVITY.map((entry) => (
                  <div key={entry.title} className={styles.activityRow}>
                    <span className={styles.activityDot} />
                    <div>
                      <div className={styles.activityEvent}>{entry.title}</div>
                      <div className={styles.activityMeta}>{entry.meta}</div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
