import { useState, type CSSProperties, type ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cellText, recordId } from "@/modules/ops/screens";
import { toneOf } from "@/modules/ops/tone";
import type { OpsScreenDef } from "@/modules/ops/types";
import type { Tone, WorkspaceCell, WorkspaceRow } from "@/types/common";
import styles from "./Ops.module.css";

export interface LayoutProps {
  screen: OpsScreenDef;
  tab: string;
  rows: WorkspaceRow[];
  stageOf: (id: string) => number;
  onOpen: (id: string) => void;
  /** Opens an action dialog for one record; undefined when the role can't act. */
  onAction?: (id: string, action: string) => void;
  /** Opens an action that applies to every record in view (route plan toolbar). */
  onRouteAction?: (action: string) => void;
}

const RAIL: Record<Tone, string> = {
  green: "var(--brand)",
  amber: "var(--amber-tx)",
  red: "var(--red-tx)",
  blue: "var(--blue-tx)",
  grey: "var(--bd)",
};

export function StatusBadge({ cell }: { cell: WorkspaceCell }) {
  return <Badge label={cellText(cell)} tone={toneOf(cell)} />;
}

const rail = (cell: WorkspaceCell) => ({ "--rail": RAIL[toneOf(cell)] }) as CSSProperties;
const last = (s: OpsScreenDef) => s.columns.length - 1;
const initials = (name: string) =>
  name
    .replace(/^[A-Z]+-\d+\s*/, "")
    .replace(/[^a-zA-Z ]/g, " ")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel} title={label}>
        {label}
      </span>
      <span className={styles.statValue}>{value}</span>
    </div>
  );
}

function MiniSteps({ screen, stage }: { screen: OpsScreenDef; stage: number }) {
  if (!screen.flow.length) return null;
  return (
    <div className={styles.miniSteps} title={`Stage: ${screen.flow[stage]?.label ?? ""}`}>
      {screen.flow.map((f, i) => (
        <span key={f.label} className={styles.miniStep} data-state={i < stage ? "done" : i === stage ? "now" : "todo"} />
      ))}
    </div>
  );
}

function Empty({ tab }: { tab: string }) {
  return <EmptyState title={`Nothing in "${tab}"`} description="Try another tab or clear the search." />;
}

/* ---------------- generic record cards (consignment, loadplan, rules, payrun) ---------------- */

export function RecordCardsLayout({ screen, tab, rows, stageOf, onOpen }: LayoutProps) {
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  return (
    <div className={styles.cardGrid}>
      {rows.map((row) => {
        const id = recordId(row);
        const stage = stageOf(id);
        return (
          <button key={id} type="button" className={styles.recordCard} style={rail(row[L])} onClick={() => onOpen(id)}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>{id}</div>
                <div className={styles.cardSub}>
                  {cellText(row[1])} · {cellText(row[2])}
                </div>
              </div>
              <StatusBadge cell={row[L]} />
            </div>
            <div className={styles.stats}>
              {[3, 4, 5, 6]
                .filter((i) => i < L)
                .slice(0, 3)
                .map((i) => (
                  <Stat key={i} label={screen.columns[i]!} value={cellText(row[i])} />
                ))}
            </div>
            <MiniSteps screen={screen} stage={stage} />
            {screen.flow.length ? (
              <div className={styles.cardFoot}>
                <span>{screen.flow[stage]?.label}</span>
                <span>
                  {stage + 1} of {screen.flow.length}
                </span>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- sites (stalls, vehicles) ---------------- */

export function SitesLayout({ screen, tab, rows, onOpen }: LayoutProps) {
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  const pctIdx = screen.columns.findIndex((c) => /utilisation|utilization|fill rate/i.test(c));
  return (
    <div className={styles.cardGrid}>
      {rows.map((row) => {
        const id = recordId(row);
        const pct = pctIdx >= 0 ? parseInt(cellText(row[pctIdx]), 10) || 0 : null;
        return (
          <button key={id} type="button" className={styles.recordCard} style={rail(row[L])} onClick={() => onOpen(id)}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>{id}</div>
                <div className={styles.cardSub}>
                  {cellText(row[1])} · {cellText(row[2])}
                </div>
              </div>
              <StatusBadge cell={row[L]} />
            </div>
            <Stat label={screen.columns[3]!} value={cellText(row[3])} />
            {pct !== null ? (
              <div>
                <div className={styles.cardFoot}>
                  <span>{screen.columns[pctIdx]}</span>
                  <span>{pct}%</span>
                </div>
                <div className={styles.bar}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${Math.min(100, pct)}%`, background: pct > 90 ? "var(--red-tx)" : pct > 75 ? "var(--amber-tx)" : undefined }}
                  />
                </div>
              </div>
            ) : null}
            <div className={styles.stats}>
              {[4, 5, 6]
                .filter((i) => i < L && i !== pctIdx)
                .map((i) => (
                  <Stat key={i} label={screen.columns[i]!} value={cellText(row[i])} />
                ))}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- network (bd-overview, stall-overview, stall-areas) ---------------- */

export function NetworkLayout({ screen, tab, rows, onOpen }: LayoutProps) {
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  if (/alert/i.test(tab)) {
    return (
      <div className={styles.wrap}>
        {rows.map((row) => {
          const id = recordId(row);
          return (
            <button key={id} type="button" className={styles.alertRow} style={rail(row[L])} onClick={() => onOpen(id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className={styles.cardTitle}>{id}</div>
                {cellText(row[1]) !== "—" ? <div className={styles.cardSub}>{cellText(row[1])}</div> : null}
              </div>
              <StatusBadge cell={row[L]} />
            </button>
          );
        })}
      </div>
    );
  }
  if (/funnel/i.test(tab)) {
    return (
      <div className={styles.panel}>
        <div className={styles.funnel}>
          {rows.map((row, ri) => {
            const pct = parseFloat(cellText(row[L])) || 0;
            let n = 0;
            for (let k = 1; k < L; k++) {
              const raw = cellText(row[k]);
              if (raw === "—" || /%|₹/.test(raw)) continue;
              n = Math.max(n, parseInt(raw.replace(/[^\d]/g, ""), 10) || 0);
            }
            return (
              <button key={recordId(row)} type="button" className={styles.funnelRow} style={{ background: "none", border: "none", font: "inherit", color: "inherit", cursor: "pointer", padding: 0, textAlign: "left" }} onClick={() => onOpen(recordId(row))}>
                <span>{recordId(row)}</span>
                <div className={styles.funnelBar}>
                  <div
                    className={styles.funnelFill}
                    style={{ width: `${Math.max(6, Math.min(100, pct))}%`, background: ri === 0 ? "var(--brand)" : ri < 3 ? "var(--blue-tx)" : ri === 3 ? "var(--amber-tx)" : "var(--brand)" }}
                  >
                    {n ? n.toLocaleString("en-IN") : ""}
                  </div>
                </div>
                <span className={styles.mono}>{cellText(row[L])}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }
  const at = (re: RegExp) => screen.columns.findIndex((c) => re.test(c));
  const iHub = at(/dark store/i);
  const iStalls = at(/container store|^stalls$/i);
  return (
    <div className={styles.cardGrid}>
      {rows.map((row) => {
        const id = recordId(row);
        const m = iStalls >= 0 ? cellText(row[iStalls]).match(/(\d+)\s*(?:of|\/)\s*(\d+)/) : null;
        const have = m ? Number(m[1]) : 0;
        const want = m ? Number(m[2]) : 0;
        const isArea = iHub >= 0 && Boolean(m);
        return (
          <button key={id} type="button" className={styles.recordCard} style={rail(row[L])} onClick={() => onOpen(id)}>
            <div className={styles.cardTop}>
              <div>
                <div className={styles.cardTitle}>{id}</div>
                {isArea ? <div className={styles.cardSub}>Main dark store {cellText(row[iHub]).split(" · ")[0]} holds the stock</div> : null}
              </div>
              <StatusBadge cell={row[L]} />
            </div>
            {isArea ? (
              <div>
                <div className={styles.slots} aria-label={`${have + 1} of ${want + 1} stores live`}>
                  <span className={styles.slot} data-hub="true" title="Main dark store" />
                  {Array.from({ length: want }, (_, i) => (
                    <span key={i} className={styles.slot} data-filled={i < have} title={i < have ? "Container store live" : "Container store to build"} />
                  ))}
                </div>
                <div className={styles.cardFoot} style={{ marginTop: 6 }}>
                  <span>{want - have > 0 ? `${want - have} container store${want - have === 1 ? "" : "s"} still to build` : `All ${want} container stores standing`}</span>
                  <span>
                    {have + 1} of {want + 1} live
                  </span>
                </div>
              </div>
            ) : null}
            <div className={styles.stats}>
              {screen.columns.slice(1, L).map((c, i) =>
                i + 1 === iHub ? null : <Stat key={c} label={c} value={cellText(row[i + 1])} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- directory (bd-ops, stall-staff) ---------------- */

export function DirectoryLayout({ screen, tab, rows, onOpen, onAction }: LayoutProps) {
  const [sel, setSel] = useState(0);
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  const row = rows[Math.min(sel, rows.length - 1)]!;
  const id = recordId(row);
  const [name, role] = id.split(" · ");
  return (
    <div className={styles.split}>
      <div className={styles.listCol}>
        {rows.map((r, i) => {
          const rid = recordId(r);
          return (
            <button key={rid} type="button" className={styles.listItem} style={rail(r[L])} data-selected={i === sel} onClick={() => setSel(i)}>
              <span className={styles.avatar}>{initials(rid.split(" · ")[0]!)}</span>
              <div className={styles.listBody}>
                <div className={styles.listName}>{rid.split(" · ")[0]}</div>
                <div className={styles.listMeta}>{cellText(r[2])}</div>
              </div>
              <StatusBadge cell={r[L]} />
            </button>
          );
        })}
      </div>
      <div className={styles.panel}>
        <div className={styles.paneHead}>
          <span className={styles.avatarLg}>{initials(name!)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.cardTitle}>{name}</div>
            <div className={styles.cardSub}>{role ?? cellText(row[1])}</div>
          </div>
          <StatusBadge cell={row[L]} />
        </div>
        <div className={styles.fieldGrid}>
          {screen.columns.slice(1, L).map((c, i) => (
            <Stat key={c} label={c} value={cellText(row[i + 1])} />
          ))}
        </div>
        <div className={styles.quick}>
          <Button size="sm" variant="primary" onClick={() => onOpen(id)}>
            Open record
          </Button>
          {onAction
            ? screen.actions.map((a) => (
                <Button key={a} size="sm" onClick={() => onAction(id, a)}>
                  {a}
                </Button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- dispatch (deliveries, bd-track, bulk-track) ---------------- */

export function DispatchLayout({ screen, tab, rows, onOpen, onAction }: LayoutProps) {
  const [sel, setSel] = useState(0);
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  const row = rows[Math.min(sel, rows.length - 1)]!;
  const id = recordId(row);
  const st = cellText(row[L]);
  const at = /delivered|closed/i.test(st) ? 3 : /needs rider|blocked|scheduled|not started/i.test(st) ? 0 : /arriv|at a stop|unloading/i.test(st) ? 2 : 1;
  const legs = [
    { name: "Start", sub: cellText(row[screen.columns.findIndex((c) => /zone|area|origin/i.test(c))] ?? "Store") },
    { name: "Picked up", sub: cellText(row[screen.columns.findIndex((c) => /rider|operator|vehicle/i.test(c))] ?? "—") },
    { name: "En route", sub: cellText(row[screen.columns.findIndex((c) => /distance|current stop|destination/i.test(c))] ?? "—") },
    { name: "Drop", sub: cellText(row[screen.columns.findIndex((c) => /customer|next customer|client/i.test(c))] ?? "—") },
  ];
  return (
    <div className={styles.split}>
      <div className={styles.listCol}>
        {rows.map((r, i) => (
          <button key={recordId(r)} type="button" className={styles.listItem} style={rail(r[L])} data-selected={i === sel} onClick={() => setSel(i)}>
            <div className={styles.listBody}>
              <div className={styles.listName}>
                <span className={styles.mono}>{recordId(r)}</span>
              </div>
              <div className={styles.listMeta}>
                {cellText(r[1])} · {cellText(r[2])}
              </div>
            </div>
            <StatusBadge cell={r[L]} />
          </button>
        ))}
      </div>
      <div className={styles.panel}>
        <div className={styles.cardTop}>
          <div>
            <div className={styles.cardTitle}>
              <span className={styles.mono}>{id}</span>
            </div>
            <div className={styles.cardSub}>
              {screen.columns[1]} {cellText(row[1])} · {screen.columns[2]} {cellText(row[2])}
            </div>
          </div>
          <StatusBadge cell={row[L]} />
        </div>
        <div className={styles.legs}>
          {legs.map((l, i) => (
            <div key={l.name} className={styles.leg}>
              <div className={styles.legLine}>
                <span className={styles.legSeg} data-on={i > 0 && i <= at} style={{ visibility: i === 0 ? "hidden" : undefined }} />
                <span className={styles.legDot} data-state={i < at ? "done" : i === at ? "now" : "todo"}>
                  {i + 1}
                </span>
                <span className={styles.legSeg} data-on={i < at} style={{ visibility: i === legs.length - 1 ? "hidden" : undefined }} />
              </div>
              <span className={styles.legName}>{l.name}</span>
              <span className={styles.legSub}>{l.sub}</span>
            </div>
          ))}
        </div>
        <div className={styles.fieldGrid}>
          {screen.columns.slice(3, L).map((c, i) => (
            <Stat key={c} label={c} value={cellText(row[i + 3])} />
          ))}
        </div>
        <div className={styles.quick}>
          <Button size="sm" variant="primary" onClick={() => onOpen(id)}>
            Open record
          </Button>
          {onAction
            ? screen.actions.map((a) => (
                <Button key={a} size="sm" onClick={() => onAction(id, a)}>
                  {a}
                </Button>
              ))
            : null}
        </div>
      </div>
    </div>
  );
}

/* ---------------- run sheet (bd-stops) ---------------- */

export function RunSheetLayout({ screen, tab, rows, onOpen, onAction }: LayoutProps) {
  const L = last(screen);
  const all = rows;
  const n = (re: RegExp) => all.filter((r) => re.test(cellText(r[L]))).length;
  const done = n(/delivered/i);
  const failed = n(/fail|unreachable|refused|issue/i);
  const skipped = n(/skip|gate|closed|tomorrow/i);
  const total = all.length;
  const seq = [...rows].sort((a, b) => (parseInt(cellText(a[0]), 10) || 0) - (parseInt(cellText(b[0]), 10) || 0));
  return (
    <div className={styles.wrap}>
      <div className={styles.runHead}>
        <div className={styles.cardTop}>
          <div className={styles.cardTitle}>
            {done} of {total} stops in view delivered
          </div>
          <span className={styles.muted}>
            {failed} failed · {skipped} skipped or moved
          </span>
        </div>
        <div className={styles.runBar}>
          <div style={{ width: `${total ? (done / total) * 100 : 0}%`, background: "var(--brand)" }} />
          <div style={{ width: `${total ? (failed / total) * 100 : 0}%`, background: "var(--red-tx)" }} />
          <div style={{ width: `${total ? (skipped / total) * 100 : 0}%`, background: "var(--amber-tx)" }} />
        </div>
      </div>
      {!seq.length ? (
        <Empty tab={tab} />
      ) : (
        <div className={styles.stopRail}>
          {seq.map((row, i) => {
            const id = recordId(row);
            const st = cellText(row[L]);
            const isDone = /delivered/i.test(st);
            const isNext = /next stop/i.test(st);
            const tone = toneOf(row[L]);
            return (
              <div key={id} className={styles.stop}>
                <div className={styles.stopMarkCol}>
                  <span
                    className={styles.stopMark}
                    style={{ background: tone === "grey" ? undefined : RAIL[tone], color: tone === "grey" ? undefined : "#fff" }}
                  >
                    {isDone ? "✓" : tone === "red" ? "✕" : tone === "amber" ? "!" : isNext ? "▸" : cellText(row[0])}
                  </span>
                  {i < seq.length - 1 ? <span className={styles.stopRailLine} style={{ background: RAIL[tone] }} /> : null}
                </div>
                <div className={styles.stopCard} data-next={isNext} onClick={() => onOpen(id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(id)}>
                  <div className={styles.cardTop}>
                    <div>
                      <div className={styles.cardTitle}>
                        Stop {cellText(row[0])} · <span className={styles.mono}>{cellText(row[1])}</span>
                      </div>
                      <div className={styles.cardSub}>
                        {cellText(row[2])} · {cellText(row[3])} · {cellText(row[4])} bag(s)
                      </div>
                    </div>
                    <StatusBadge cell={row[L]} />
                  </div>
                  <div className={styles.cardFoot}>
                    <span>
                      Arrived {cellText(row[5])} · {cellText(row[6])} at stop
                    </span>
                    {onAction && !isDone ? (
                      <span className={styles.quick} onClick={(e) => e.stopPropagation()}>
                        <button type="button" className={styles.linkBtn} onClick={() => onAction(id, "Mark delivered")}>
                          Mark delivered
                        </button>
                        <button type="button" className={styles.linkBtn} onClick={() => onAction(id, "Reattempt stop")}>
                          Reattempt
                        </button>
                        <button type="button" className={styles.linkBtn} onClick={() => onAction(id, "Call customer")}>
                          Call
                        </button>
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ---------------- route plan (bd-route) ---------------- */

export function RoutePlanLayout({ screen, tab, rows, onOpen, onAction, onRouteAction }: LayoutProps) {
  const L = last(screen);
  const isSeq = /sequence|manual/i.test(tab);
  return (
    <div className={styles.wrap}>
      {onRouteAction ? (
        <div className={styles.quick}>
          <Button size="sm" variant="primary" onClick={() => onRouteAction("Optimise route")}>
            Optimise route
          </Button>
          <Button size="sm" onClick={() => onRouteAction("Add stop")}>
            Add stop
          </Button>
          <Button size="sm" onClick={() => onRouteAction("Compare routes")}>
            Compare routes
          </Button>
          <Button size="sm" onClick={() => onRouteAction("Apply route")}>
            Apply route
          </Button>
        </div>
      ) : null}
      {!rows.length ? (
        <Empty tab={tab} />
      ) : isSeq ? (
        <div className={styles.stopRail}>
          {rows.map((row, i) => {
            const id = recordId(row);
            const st = cellText(row[L]);
            const locked = /lock/i.test(st);
            const tone = toneOf(row[L]);
            return (
              <div key={id} className={styles.stop}>
                <div className={styles.stopMarkCol}>
                  <span className={styles.stopMark} style={{ background: RAIL[tone === "grey" ? "green" : tone], color: "#fff" }}>
                    {i + 1}
                  </span>
                  {i < rows.length - 1 ? <span className={styles.stopRailLine} /> : null}
                </div>
                <div className={styles.stopCard} onClick={() => onOpen(id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onOpen(id)}>
                  <div className={styles.cardTop}>
                    <div>
                      <div className={styles.cardTitle}>
                        {cellText(row[2])} · <span className={styles.mono}>{cellText(row[1])}</span>
                      </div>
                      <div className={styles.cardSub}>
                        {cellText(row[3])} · {cellText(row[4])} · {cellText(row[5])} · ETA {cellText(row[6])}
                      </div>
                    </div>
                    <StatusBadge cell={row[L]} />
                  </div>
                  {onAction ? (
                    <span className={styles.quick} onClick={(e) => e.stopPropagation()}>
                      <button type="button" className={styles.linkBtn} onClick={() => onAction(id, locked ? "Unlock stop" : "Lock stop")}>
                        {locked ? "Unlock" : "Lock"}
                      </button>
                      <button type="button" className={styles.linkBtn} onClick={() => onAction(id, "Move stop")}>
                        Move
                      </button>
                      <button type="button" className={styles.linkBtn} data-danger="true" onClick={() => onAction(id, "Remove stop")}>
                        Remove
                      </button>
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.panel}>
          {rows.map((row) => (
            <div key={recordId(row)} className={styles.row}>
              <span className={styles.rowLabel}>{recordId(row)}</span>
              <span className={styles.rowValue}>
                {[1, 2, 3].map((i) => cellText(row[i])).filter((v) => v !== "—").join(" · ")} <StatusBadge cell={row[L]} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- funnel (stall-conv) ---------------- */

export function FunnelLayout({ screen, tab, rows, onOpen }: LayoutProps) {
  const steps = screen.kpis
    .map((k) => ({ label: k.label, n: parseInt(k.value.replace(/[^\d]/g, ""), 10) }))
    .filter((k) => !/%|rate|to order/i.test(k.label) && k.n > 0)
    .slice(0, 5);
  const top = steps[0]?.n || 1;
  return (
    <div className={styles.wrap}>
      <div className={styles.panel}>
        <div className={styles.sectionTitle}>Where customers drop out today</div>
        <div className={styles.funnel}>
          {steps.map((s, i) => {
            const pct = Math.round((s.n / top) * 100);
            const drop = i > 0 ? steps[i - 1]!.n - s.n : 0;
            return (
              <div key={s.label}>
                <div className={styles.funnelRow}>
                  <span>{s.label}</span>
                  <div className={styles.funnelBar}>
                    <div className={styles.funnelFill} style={{ width: `${Math.max(6, pct)}%`, background: i === 0 ? "var(--brand)" : i < 3 ? "var(--blue-tx)" : "var(--amber-tx)" }}>
                      {s.n.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <span className={styles.mono}>{pct}%</span>
                </div>
                {drop > 0 ? <div className={styles.funnelRow}><span /><span className={styles.funnelDrop}>−{drop.toLocaleString("en-IN")} dropped here</span></div> : null}
              </div>
            );
          })}
        </div>
      </div>
      {!rows.length ? <Empty tab={tab} /> : <RecordCardsLayout screen={{ ...screen, flow: [] }} tab={tab} rows={rows} stageOf={() => 0} onOpen={onOpen} />}
    </div>
  );
}

/* ---------------- lanes: triage (bd-exceptions), campaign (stall-ads) ---------------- */

function Lanes({
  screen,
  rows,
  lanes,
  laneOf,
  onOpen,
}: {
  screen: OpsScreenDef;
  rows: WorkspaceRow[];
  lanes: { name: string; tone: Tone }[];
  laneOf: (row: WorkspaceRow) => string;
  onOpen: (id: string) => void;
}) {
  const L = last(screen);
  return (
    <div className={styles.lanes}>
      {lanes.map((lane) => {
        const items = rows.filter((r) => laneOf(r) === lane.name);
        return (
          <div key={lane.name} className={styles.lane}>
            <div className={styles.laneHead} style={{ background: `var(--${lane.tone === "green" ? "bsoft" : lane.tone + "-bg"})`, color: lane.tone === "green" ? "var(--brand)" : `var(--${lane.tone}-tx)` }}>
              <span>{lane.name}</span>
              <span className={styles.mono}>{items.length}</span>
            </div>
            {items.length === 0 ? <div className={styles.laneEmpty}>None</div> : null}
            {items.map((row) => {
              const id = recordId(row);
              return (
                <button key={id} type="button" className={styles.recordCard} style={rail(row[L])} onClick={() => onOpen(id)}>
                  <div className={styles.cardTop}>
                    <div className={styles.cardTitle}>{id}</div>
                    <StatusBadge cell={row[L]} />
                  </div>
                  <div className={styles.cardSub}>
                    {screen.columns[1]} {cellText(row[1])} · {screen.columns[2]} {cellText(row[2])}
                  </div>
                  <div className={styles.cardFoot}>
                    <span>
                      {screen.columns[4]}: {cellText(row[4])}
                    </span>
                    <span>
                      {screen.columns[5]}: {cellText(row[5])}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function TriageLayout({ screen, tab, rows, onOpen }: LayoutProps) {
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  const sev = (row: WorkspaceRow) => {
    const t = `${cellText(row[6])} ${cellText(row[L])}`;
    if (/resolved/i.test(t)) return "Resolved";
    return /paused|puncture|refused|whole batch|unavailable/i.test(t) ? "Critical" : /skipped|not found|blocked|eta/i.test(t) ? "High" : "Medium";
  };
  return (
    <Lanes
      screen={screen}
      rows={rows}
      onOpen={onOpen}
      laneOf={sev}
      lanes={[
        { name: "Critical", tone: "red" },
        { name: "High", tone: "amber" },
        { name: "Medium", tone: "blue" },
        { name: "Resolved", tone: "green" },
      ]}
    />
  );
}

export function CampaignLayout({ screen, tab, rows, onOpen }: LayoutProps) {
  if (!rows.length) return <Empty tab={tab} />;
  const L = last(screen);
  const state = (row: WorkspaceRow) => {
    const v = cellText(row[L]);
    return /running|live|ends in/i.test(v) ? "Live" : /schedul|starts/i.test(v) ? "Scheduled" : /draft|pending/i.test(v) ? "Draft" : "Ended";
  };
  return (
    <Lanes
      screen={screen}
      rows={rows}
      onOpen={onOpen}
      laneOf={state}
      lanes={[
        { name: "Live", tone: "green" },
        { name: "Scheduled", tone: "blue" },
        { name: "Draft", tone: "grey" },
        { name: "Ended", tone: "grey" },
      ]}
    />
  );
}
