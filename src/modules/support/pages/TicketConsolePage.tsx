import { useMemo, useState } from "react";
import { Send, StickyNote } from "lucide-react";
import {
  useSupportTickets,
  useReplyToTicket,
  useAssignAgent,
  useSetTicketStatus,
  useCreateTicket,
} from "@/modules/support/hooks/useSupportTickets";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { SupportWorkerKind } from "@/types/supportTicket";
import type { KpiStat } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import styles from "./TicketConsolePage.module.css";

const FLOW_BY_KIND: Record<SupportWorkerKind, { label: string; actor: string }[]> = {
  rider: [
    { label: "Raised", actor: "Rider app" },
    { label: "Assigned", actor: "Support lead" },
    { label: "Investigating", actor: "Agent" },
    { label: "Waiting on rider", actor: "Agent" },
    { label: "Resolved", actor: "Agent" },
    { label: "Closed", actor: "System" },
  ],
  picker: [
    { label: "Raised", actor: "Picker app" },
    { label: "Assigned", actor: "Store Ops" },
    { label: "Investigating", actor: "Agent" },
    { label: "Waiting on picker", actor: "Agent" },
    { label: "Resolved", actor: "Agent" },
    { label: "Closed", actor: "System" },
  ],
};
const FLOW_AT = 2;

const AGENTS_BY_KIND: Record<SupportWorkerKind, string[]> = {
  rider: ["Support Desk A", "Support Desk B", "Support Desk C"],
  picker: ["Store Ops Desk A", "Store Ops Desk B"],
};

const MODULE_BY_KIND: Record<SupportWorkerKind, ModuleId> = {
  rider: "rider-support",
  picker: "picker-support",
};

const TABS = ["My queue", "Open", "Urgent", "Waiting", "Escalated", "Resolved"];

function tabsFor(status: string, priority: string): string[] {
  const tabs = ["My queue"];
  if (status === "Investigating" || status === "Open") tabs.push("Open");
  if (priority === "P1") tabs.push("Urgent");
  if (status.startsWith("Waiting")) tabs.push("Waiting");
  if (status === "Escalated") tabs.push("Escalated");
  if (status === "Resolved") tabs.push("Resolved");
  return tabs;
}

export function TicketConsolePage({ kind }: { kind: SupportWorkerKind }) {
  const { data: tickets, isLoading, isError, refetch } = useSupportTickets(kind);
  const [tab, setTab] = useState("Open");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [reply, setReply] = useState("");
  const [noteText, setNoteText] = useState("");
  const replyMutation = useReplyToTicket(kind);
  const assignAgent = useAssignAgent(kind);
  const setStatus = useSetTicketStatus(kind);
  const createTicket = useCreateTicket(kind);
  const pushToast = useUiStore((s) => s.pushToast);
  const { can } = usePermission();
  const moduleId = MODULE_BY_KIND[kind];

  const filtered = useMemo(
    () => (tickets ?? []).filter((t) => tabsFor(t.status?.label ?? "", t.priority).includes(tab)),
    [tickets, tab],
  );
  const selected =
    tickets?.find((t) => t.id === selectedId) ??
    filtered[0] ??
    tickets?.find((t) => t.status?.label === "Open" || t.status?.label === "Investigating") ??
    tickets?.[0];

  if (isLoading) return <CardSkeleton />;
  if (isError || !tickets) return <ErrorState message="Couldn't load tickets." onRetry={() => refetch()} />;

  const open = tickets.filter((t) => t.status?.label !== "Resolved" && t.status?.label !== "Closed").length;
  const urgent = tickets.filter((t) => t.priority === "P1").length;
  const waiting = tickets.filter((t) => (t.status?.label ?? "").startsWith("Waiting")).length;
  const escalated = tickets.filter((t) => t.status?.label === "Escalated").length;
  const resolved = tickets.filter((t) => t.status?.label === "Resolved").length;

  const liveKpis: KpiStat[] = [
    { value: String(open), label: "Open" },
    { value: String(urgent), label: "Urgent", color: urgent ? "var(--red-tx)" : undefined },
    { value: String(waiting), label: "Waiting", color: waiting ? "var(--amber-tx)" : undefined },
    { value: String(escalated), label: "Escalated", color: escalated ? "var(--red-tx)" : undefined },
    { value: String(tickets.length), label: "Total tickets" },
    { value: resolved ? `${Math.round((resolved / Math.max(1, tickets.length)) * 100)}%` : "—", label: "Resolved rate" },
  ];

  const canReply = can(moduleId, "edit");
  const canAssign = can(moduleId, "assign");

  function sendReply() {
    if (!selected) return;
    const text = reply.trim() || "Acknowledged — support is reviewing this ticket.";
    replyMutation.mutate(
      { id: selected.id, text, internal: false },
      { onSuccess: () => setReply(""), onError: () => pushToast("Couldn't send reply", "error") },
    );
  }

  function addNote() {
    if (!selected || !noteText.trim()) return;
    replyMutation.mutate(
      { id: selected.id, text: noteText, internal: true },
      { onSuccess: () => setNoteText(""), onError: () => pushToast("Couldn't add note", "error") },
    );
  }

  function changeStatus(label: string, tone: "green" | "amber" | "red" | "blue" | "grey") {
    if (!selected) return;
    setStatus.mutate(
      { id: selected.id, status: { label, tone } },
      { onSuccess: () => pushToast(`${selected.id} marked ${label}`, "success") },
    );
  }

  function assignFirstAgent() {
    if (!selected) return;
    const agent = AGENTS_BY_KIND[kind][0] as string;
    assignAgent.mutate({ id: selected.id, agent }, { onSuccess: () => pushToast(`Assigned to ${agent}`, "success") });
  }

  function raiseRelatedTicket(subject: string, category: string) {
    if (!selected) return;
    createTicket.mutate(
      {
        subject,
        description: `${category} follow-up for ${selected.id}: ${selected.issue}`,
        category,
        priority: selected.priority === "P1" ? "high" : "medium",
        customerName: selected.person || "Worker",
        customerEmail: `${(selected.person || "worker").toLowerCase().replace(/\s+/g, ".")}@example.com`,
      },
      {
        onSuccess: (t) => pushToast(`Created ${t.id || "ticket"}: ${subject}`, "success"),
        onError: () => pushToast("Couldn't create related ticket", "error"),
      },
    );
  }

  return (
    <div className={styles.wrap}>
      <KpiStrip moduleId={MODULE_BY_KIND[kind]} kpis={liveKpis} />

      <Card className={styles.flowCard}>
        <FlowStrip flow={FLOW_BY_KIND[kind]} activeIndex={FLOW_AT} />
      </Card>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
        <Button size="sm" variant="primary" disabled={!selected || !canReply} onClick={sendReply}>
          <Send size={13} /> Reply
        </Button>
        <Button size="sm" disabled={!selected || !canAssign} onClick={assignFirstAgent} aria-label="Assign">
          Assign
        </Button>
        <Button size="sm" disabled={!selected} onClick={() => changeStatus("Escalated", "red")}>
          Escalate
        </Button>
        <Button size="sm" disabled={!selected} onClick={() => changeStatus("Resolved", "green")}>
          Resolve
        </Button>
        <Button size="sm" disabled={!selected} onClick={() => changeStatus("Closed", "grey")}>
          Close
        </Button>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
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
                  <Badge label={t.status?.label ?? "—"} tone={t.status?.tone ?? "grey"} />
                </div>
                <div className={styles.queuePerson}>{t.person}</div>
                <div className={styles.queueIssue}>{t.issue}</div>
                <div className={styles.queueMeta}>
                  {t.priority} · {t.age}
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
                    {selected.id} · {selected.person} {selected.context !== "—" ? `· ${selected.context}` : ""}
                  </div>
                </div>
                <Badge label={selected.status?.label ?? "—"} tone={selected.status?.tone ?? "grey"} />
              </div>

              {canAssign ? (
                <div className={styles.assignRow}>
                  <span className={styles.assignLabel}>Agent</span>
                  <Select
                    value={selected.agent}
                    onValueChange={(v) =>
                      assignAgent.mutate({ id: selected.id, agent: v }, { onSuccess: () => pushToast(`Assigned to ${v}`, "success") })
                    }
                    options={AGENTS_BY_KIND[kind].map((a) => ({ value: a, label: a }))}
                  />
                </div>
              ) : null}

              <div className={styles.thread}>
                {(selected.thread?.length ?? 0) === 0 ? (
                  <div className={styles.emptyThread}>No messages yet.</div>
                ) : (
                  selected.thread.map((m, i) => (
                    <div key={i} className={styles.message} data-internal={m.internal}>
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
                <>
                  <div className={styles.composer}>
                    <textarea
                      className={styles.composerInput}
                      placeholder={`Reply to ${selected.person}`}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                      rows={2}
                    />
                    <Button size="sm" variant="primary" onClick={sendReply} isLoading={replyMutation.isPending}>
                      <Send size={13} /> Reply
                    </Button>
                  </div>
                  <div className={styles.composer}>
                    <textarea
                      className={styles.composerInput}
                      placeholder="Internal note (not visible to the worker)"
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      rows={2}
                    />
                    <Button size="sm" onClick={addNote} isLoading={replyMutation.isPending}>
                      <StickyNote size={13} /> Add note
                    </Button>
                  </div>
                </>
              ) : null}

              <div className={styles.actionsRow}>
                <Button size="sm" onClick={() => changeStatus("Escalated", "red")}>
                  Escalate
                </Button>
                <Button size="sm" onClick={() => changeStatus("Resolved", "green")}>
                  Resolve ticket
                </Button>
                <Button size="sm" onClick={() => changeStatus("Closed", "grey")}>
                  Close ticket
                </Button>
                {kind === "rider" ? (
                  <Button
                    size="sm"
                    isLoading={createTicket.isPending}
                    onClick={() => raiseRelatedTicket(`Earning adjustment · ${selected.id}`, "earnings")}
                  >
                    Adjust earning
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    isLoading={createTicket.isPending}
                    onClick={() => raiseRelatedTicket(`Scanner issue · ${selected.id}`, "scanner")}
                  >
                    Raise scanner ticket
                  </Button>
                )}
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
