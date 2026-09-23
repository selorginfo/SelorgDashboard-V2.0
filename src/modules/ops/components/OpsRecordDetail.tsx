import type { ReactNode } from "react";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StageStepper } from "@/components/workspace/StageStepper";
import { actionForm, cellText, isDangerAction } from "@/modules/ops/screens";
import { StatusBadge } from "@/modules/ops/components/OpsLayouts";
import { toneOf } from "@/modules/ops/tone";
import { formatDateTime } from "@/lib/format";
import type { OpsLogEntry, OpsScreenDef } from "@/modules/ops/types";
import type { WorkspaceRow } from "@/types/common";
import styles from "./Ops.module.css";

interface Props {
  screen: OpsScreenDef;
  row: WorkspaceRow;
  stage: number;
  log: OpsLogEntry[];
  canAct: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isBusy?: boolean;
  backLabel: string;
  onBack: () => void;
  onAction: (action: string) => void;
  onAdvance: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onLink: (route: string, ref: string) => void;
}

const V = (row: WorkspaceRow, i: number) => (i < 0 ? "—" : cellText(row[i]));
const NUM = (v: string) => (/\d/.test(v) ? parseInt(v.replace(/[^\d]/g, ""), 10) || 0 : null);

function Row({ label, children, total }: { label: string; children: ReactNode; total?: boolean }) {
  return (
    <div className={total ? styles.rowTotal : styles.row}>
      <span className={styles.rowLabel}>{label}</span>
      <span className={styles.rowValue}>{children}</span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className={styles.panel}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </Card>
  );
}

/** Design rule: the action that owns the current stage leads; a stage waiting on someone else offers none. */
function primaryAction(screen: OpsScreenDef, stage: number): string | null {
  const stageName = screen.flow[stage]?.label ?? "";
  const acts = screen.actions.filter((a) => a !== "Export view");
  const advancing = acts.filter((a) => actionForm(a)?.advances);
  const waiting = /awaiting|pending|in transit|in review/i.test(stageName);
  // Stemming ("assigned" → "assign") only applies when matching the next stage.
  const matches = (label: string, stem = false) => (a: string) =>
    label
      .toLowerCase()
      .split(/\s+/)
      .some((w) => w.length > 4 && a.toLowerCase().includes(stem ? w.replace(/(ed|d)$/, "") : w));
  // The action that produces the next stage leads ("Vehicle assigned" → "Assign vehicle") …
  const next = screen.flow[stage + 1]?.label;
  const toNext = next && !waiting ? advancing.find(matches(next, true)) : undefined;
  if (toNext) return toNext;
  // … then the design's rule: an action named after the current stage.
  const own = acts.find((a) => !(waiting && /^(submit|send|raise|request)\b/i.test(a)) && matches(stageName)(a));
  if (own) return own;
  if (waiting) return null;
  return advancing[Math.min(stage, Math.max(0, advancing.length - 1))] ?? acts[0] ?? null;
}

export function OpsRecordDetail(p: Props) {
  const { screen, row, stage } = p;
  const L = screen.columns.length - 1;
  const cols = screen.columns;
  const title = V(row, 0);
  const complete = screen.flow.length > 0 && stage >= screen.flow.length - 1;
  const primary = p.canAct ? primaryAction(screen, stage) : null;
  const next = screen.flow[stage + 1];
  const secondary = screen.actions.filter((a) => a !== primary);

  return (
    <div className={styles.wrap}>
      <Button size="sm" variant="ghost" className={styles.back} onClick={p.onBack}>
        <ArrowLeft size={13} /> {p.backLabel}
      </Button>

      <Card className={styles.detailHead}>
        <div className={styles.detailTop}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.detailTitle}>
              {title}
              <StatusBadge cell={row[L]} />
            </div>
            <div className={styles.detailSub}>
              {screen.entity} · {cols[1]} {V(row, 1)} · {cols[2]} {V(row, 2)}
            </div>
          </div>
          <div className={styles.detailActions}>
            {screen.flow.length ? (
              <span className={styles.stagePill} data-done={complete}>
                {screen.flow[stage]?.label}
              </span>
            ) : null}
            {primary ? (
              <Button size="sm" variant="primary" isLoading={p.isBusy} onClick={() => p.onAction(primary)}>
                {primary}
              </Button>
            ) : screen.flow.length && p.canAct ? (
              <Button size="sm" disabled title={`Owned by ${screen.flow[stage]?.actor ?? "another team"}`}>
                Awaiting {screen.flow[stage]?.label.toLowerCase()}
              </Button>
            ) : null}
            {p.canAct && screen.flow.length && !complete ? (
              <Button size="sm" isLoading={p.isBusy} onClick={p.onAdvance}>
                Mark {next?.label}
              </Button>
            ) : null}
            {p.canEdit ? (
              <Button size="sm" onClick={p.onEdit}>
                <Pencil size={12} /> Edit
              </Button>
            ) : null}
            {p.canDelete ? (
              <Button size="sm" variant="danger" onClick={p.onDelete}>
                <Trash2 size={12} /> Delete
              </Button>
            ) : null}
          </div>
        </div>
        {screen.flow.length ? (
          <>
            <StageStepper stages={screen.flow.map((f) => f.label)} current={stage} />
            <div className={styles.nextLine}>
              {next ? `Next: ${next.label} · ${next.actor}` : "This is the final stage"} · owner now: {screen.flow[stage]?.actor}
            </div>
          </>
        ) : null}
        {p.canAct && secondary.length ? (
          <div className={styles.secondary}>
            {secondary.map((a) => (
              <Button key={a} size="sm" variant={isDangerAction(a) ? "danger" : "secondary"} onClick={() => p.onAction(a)}>
                {a}
              </Button>
            ))}
          </div>
        ) : null}
      </Card>

      <div className={styles.detailGrid}>
        <div className={styles.detailMain}>
          <PatternBody {...p} />
        </div>
        <div className={styles.detailSide}>
          {screen.links.length ? (
            <Panel title="Linked records">
              {screen.links.map((l) => {
                const ref = l.col !== undefined ? `${V(row, l.col)}${l.suffix ?? ""}` : l.text ?? "";
                return (
                  <button key={l.label} type="button" className={styles.linkRow} onClick={() => p.onLink(l.route, l.col !== undefined ? V(row, l.col) : "")}>
                    <span className={styles.rowLabel}>{l.label}</span>
                    <span className={styles.linkRef}>{ref} ›</span>
                  </button>
                );
              })}
            </Panel>
          ) : null}
          <Panel title="Activity">
            {p.log.length === 0 && !screen.flow.length ? <div className={styles.muted}>No activity recorded yet.</div> : null}
            {p.log.map((e) => (
              <div key={e.id} className={styles.timelineRow}>
                <span className={styles.timelineTime}>{formatDateTime(e.at)}</span>
                <div>
                  <div className={styles.timelineName}>{e.action}</div>
                  <div className={styles.timelineWho}>
                    {e.by}
                    {e.note ? ` · ${e.note}` : ""}
                  </div>
                </div>
              </div>
            ))}
            {screen.flow
              .slice(0, stage + 1)
              .map((f, i) => ({ ...f, i }))
              .reverse()
              .map((f) => (
                <div key={f.label} className={styles.timelineRow}>
                  <span className={styles.timelineTime}>{f.i === stage ? "Current" : "Done"}</span>
                  <div>
                    <div className={styles.timelineName}>{f.label}</div>
                    <div className={styles.timelineWho}>{f.actor}</div>
                  </div>
                </div>
              ))}
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* --------------------------- pattern bodies --------------------------- */

function PatternBody(p: Props) {
  const { screen, row, stage } = p;
  const cols = screen.columns;
  const L = cols.length - 1;
  const fields = (from = 1, to = L) =>
    cols.slice(from, to).map((c, i) => (
      <Row key={c} label={c}>
        {V(row, i + from)}
      </Row>
    ));

  switch (screen.detail) {
    case "lifecycle": {
      // Movement of goods / campaign windows: quantities and their reconciliation lead.
      const nums = cols
        .map((c, i) => ({ c, i, n: NUM(V(row, i)) }))
        .filter((x) => x.i > 0 && x.i < L && /orders|allocated|distributed|remaining|stalls|interactions|stops|qty|units/i.test(x.c));
      const planned = nums.find((x) => /allocated|orders|stalls/i.test(x.c)) ?? nums[0];
      const actual = nums.find((x) => /distributed|stops done|interactions/i.test(x.c) && x !== planned);
      const variance = planned?.n != null && actual?.n != null ? actual.n - planned.n : null;
      return (
        <>
          {nums.length ? (
            <Panel title="Quantities">
              {nums.map((x) => {
                const pct = planned?.n ? Math.min(100, Math.round(((x.n ?? 0) / planned.n) * 100)) : 0;
                return (
                  <div key={x.c} className={styles.qtyRow}>
                    <span>{x.c}</span>
                    <div className={styles.bar}>
                      <div className={styles.barFill} style={{ width: `${x.n === null ? 0 : pct}%`, background: planned?.n && (x.n ?? 0) < planned.n ? "var(--amber-tx)" : undefined }} />
                    </div>
                    <span className={styles.mono}>{V(row, x.i)}</span>
                  </div>
                );
              })}
              {variance !== null && planned && actual ? (
                <div className={styles.callout} data-tone={variance === 0 ? "green" : "amber"} style={{ marginTop: 10 }}>
                  {variance === 0
                    ? `${actual.c} matches ${planned.c.toLowerCase()} — nothing left to reconcile.`
                    : `${Math.abs(variance).toLocaleString("en-IN")} between ${planned.c.toLowerCase()} and ${actual.c.toLowerCase()} — reconcile before this record closes.`}
                </div>
              ) : null}
            </Panel>
          ) : null}
          <Panel title="Details">{fields()}</Panel>
        </>
      );
    }

    case "trace": {
      // Something moving through steps: progress, what is confirmed, and the step trail.
      const pct = screen.flow.length ? Math.round(((stage + 1) / screen.flow.length) * 100) : 100;
      return (
        <>
          <Panel title="Progress">
            <div className={styles.qtyRow}>
              <span>{screen.flow[stage]?.label ?? "Status"}</span>
              <div className={styles.bar}>
                <div className={styles.barFill} style={{ width: `${pct}%`, background: pct < 100 ? "var(--amber-tx)" : undefined }} />
              </div>
              <span className={styles.mono}>{pct}%</span>
            </div>
            {cols.slice(1, L).map((c, i) => {
              const v = V(row, i + 1);
              const ok = !/pending|missing|^—$|^0$/i.test(v);
              return (
                <div key={c} className={styles.checkItem}>
                  <span className={styles.checkMark} data-ok={ok}>
                    {ok ? "✓" : "…"}
                  </span>
                  <span className={styles.rowLabel} style={{ flex: 1 }}>
                    {c}
                  </span>
                  <span className={styles.rowValue}>{v}</span>
                </div>
              );
            })}
          </Panel>
          {screen.flow.length ? (
            <Panel title="Step trail">
              {screen.flow.map((f, i) => (
                <div key={f.label} className={styles.checkItem}>
                  <span className={styles.checkMark} data-ok={i < stage} style={i === stage ? { background: "var(--amber-tx)", color: "#fff" } : undefined}>
                    {i < stage ? "✓" : i === stage ? "●" : "○"}
                  </span>
                  <span style={{ flex: 1, fontWeight: 700, color: i > stage ? "var(--mu)" : undefined }}>{f.label}</span>
                  <span className={styles.muted}>{f.actor}</span>
                </div>
              ))}
            </Panel>
          ) : null}
        </>
      );
    }

    case "profile": {
      const [name, role] = V(row, 0).split(" · ");
      const initials = (name ?? "")
        .replace(/^[A-Z]+-\d+\s*/, "")
        .replace(/[^a-zA-Z ]/g, " ")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
      return (
        <>
          <Card className={styles.panel}>
            <div className={styles.paneHead}>
              <span className={styles.avatarLg}>{initials || "•"}</span>
              <div style={{ flex: 1 }}>
                <div className={styles.cardTitle}>{name}</div>
                <div className={styles.cardSub}>{role ?? V(row, 1)}</div>
              </div>
              <StatusBadge cell={row[L]} />
            </div>
            <Row label="Current state">
              <StatusBadge cell={row[L]} />
            </Row>
            {fields(1, 3)}
          </Card>
          <Panel title="Performance and assignment">
            <div className={styles.fieldGrid}>
              {cols.slice(3, L).map((c, i) => (
                <div key={c} className={styles.stat}>
                  <span className={styles.statLabel}>{c}</span>
                  <span className={styles.statValue}>{V(row, i + 3)}</span>
                </div>
              ))}
            </div>
          </Panel>
        </>
      );
    }

    case "investigate": {
      const tone = toneOf(row[L]);
      const sev = tone === "red" ? "Critical" : tone === "amber" ? "High" : "Medium";
      const ladder = ["Detected", "Triaged", "Investigating", "Action taken", "Resolved", "Audited"];
      const at = /resolved/i.test(V(row, L)) ? 4 : Math.min(stage, 4);
      return (
        <>
          <Panel title="What happened">
            <div className={styles.callout} data-tone={tone === "green" ? "green" : tone === "red" ? "red" : "amber"}>
              <strong>{sev}</strong> · {V(row, 0)} raised at {V(row, cols.findIndex((c) => /raised|time/i.test(c)))} — {V(row, L)}.
            </div>
            <Row label="Expected">{screen.flow[stage]?.label ?? "Complete"} without intervention</Row>
            <Row label="Recorded instead">
              {V(row, L)}
              {cols.findIndex((c) => /impact/i.test(c)) >= 0 ? ` · ${V(row, cols.findIndex((c) => /impact/i.test(c)))}` : ""}
            </Row>
          </Panel>
          <Panel title="Context">{fields()}</Panel>
          <Panel title="Resolution">
            <StageStepper stages={ladder} current={at} />
          </Panel>
        </>
      );
    }

    case "rule": {
      const reward = V(row, 4);
      const n = parseFloat(reward.replace(/[^\d.]/g, "")) || 0;
      const sample = /registration/i.test(V(row, 2)) ? 24 : /first order/i.test(V(row, 2)) ? 14 : 10;
      return (
        <>
          <Panel title="Rule">
            <div className={styles.ruleBox}>
              <span className={styles.ruleKey}>IF</span>
              {V(row, 3)} ({V(row, 2)})<span className={styles.ruleKey}>THEN</span>
              {V(row, 1)} earns {reward}
              <span className={styles.ruleKey}>SCOPE</span>
              {V(row, 5)} · {V(row, 6)}
            </div>
          </Panel>
          <Panel title="Worked example">
            <Row label={`${V(row, 2)} in a month (example)`}>{sample}</Row>
            <Row label="Reward per trigger">{reward}</Row>
            <Row label="Incentive earned" total>
              ₹{Math.round(n * sample).toLocaleString("en-IN")}
            </Row>
            <div className={styles.muted} style={{ marginTop: 8 }}>
              Editing an active rule creates a new version; the current one keeps paying until the new one is approved.
            </div>
          </Panel>
        </>
      );
    }

    case "payslip": {
      const held = /hold|disputed|invalid|suspend/i.test(V(row, L));
      const paid = /paid/i.test(V(row, L));
      return (
        <>
          <Panel title={`Earning ${V(row, 0)} · ${V(row, 1)}`}>
            {held ? (
              <div className={styles.callout} data-tone="red" style={{ marginBottom: 10 }}>
                Excluded from this month's payroll: {V(row, L)}. Resolve the hold before the salary run or it rolls to next month.
              </div>
            ) : null}
            <Row label="Stall">{V(row, 2)}</Row>
            <Row label="Fixed salary">{V(row, 3)}</Row>
            <Row label="Incentive (verified conversions only)">{V(row, 4)}</Row>
            <Row label="Deductions">{V(row, 5)}</Row>
            <Row label="Total payable" total>
              {V(row, 6)}
            </Row>
          </Panel>
          <Panel title="Payout">
            <Row label="Paid with">Monthly salary run</Row>
            <Row label="Method">Bank transfer</Row>
            <Row label="State">{paid ? "Paid" : held ? "Held" : "Due with next salary run"}</Row>
          </Panel>
        </>
      );
    }

    default:
      return <Panel title="Details">{fields()}</Panel>;
  }
}
