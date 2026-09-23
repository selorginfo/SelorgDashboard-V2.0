import { useEffect, useState } from "react";
import {
  useGrns,
  useStartReceivingGrn,
  useVerifyQuantityGrn,
  useSendToQcGrn,
  useAcceptGrn,
  useRejectGrn,
  useRaiseDebitNote,
  useGenerateGrn,
} from "@/modules/warehouse/hooks/useGrns";
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
import type { Grn } from "@/types/warehouse";
import type { WorkspaceRow } from "@/types/common";
import styles from "./ReceivingPage.module.css";

const GRN_COLUMNS = ["Reference", "Supplier", "SKU", "Expected", "Received", "Accepted", "Rejected", "Status"];

const STEPS = ["Expected", "Received", "Qty verified", "Quality check", "Accepted", "GRN"];

/** Best-effort mapping from a GRN's current status label to how far along STEPS it has reached —
 * the source data (workspace/data/warehouse.ts) only carries a status label, not a step index, so
 * this is a reasonable reconstruction rather than literal design data. */
function stepIndexForStatus(label: string): number {
  switch (label) {
    case "Expected":
      return 0;
    case "Receiving":
      return 1;
    case "Qty verified":
      return 2;
    case "Discrepancy":
      return 2;
    case "QC":
      return 3;
    case "Rejected":
      return 3;
    case "Accepted":
      return 4;
    case "Debit note":
    case "Closed":
      return 5;
    default:
      return 1;
  }
}

export function ReceivingPage() {
  const { data: grns, isLoading, isError, refetch } = useGrns();
  const startReceiving = useStartReceivingGrn();
  const verifyQuantity = useVerifyQuantityGrn();
  const sendToQc = useSendToQcGrn();
  const accept = useAcceptGrn();
  const reject = useRejectGrn();
  const raiseDebitNote = useRaiseDebitNote();
  const generateGrn = useGenerateGrn();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");

  useEffect(() => {
    if (!selectedId && grns && grns.length > 0) setSelectedId(grns[0]!.id);
  }, [grns, selectedId]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !grns) return <ErrorState message="Couldn't load the receiving queue." onRetry={() => refetch()} />;

  const selected = grns.find((g) => g.id === selectedId) ?? grns[0];
  const lines: { sku: string; name: string; batch: string; expected: number; received: number; accepted: number; rejected: number }[] = [];
  const totals = lines.reduce(
    (acc, l) => ({
      expected: acc.expected + l.expected,
      received: acc.received + l.received,
      accepted: acc.accepted + l.accepted,
      rejected: acc.rejected + l.rejected,
    }),
    { expected: 0, received: 0, accepted: 0, rejected: 0 }
  );
  const variance = totals.expected - totals.received;
  const fillRate = totals.expected > 0 ? `${((totals.received / totals.expected) * 100).toFixed(1)}%` : "—";
  const canApprove = can("inbound", "approve");
  const currentStep = selected ? stepIndexForStatus(selected.status.label) : 0;

  const actionVerbs = {
    start: "receiving started for",
    verify: "quantity verified for",
    qc: "sent to QC",
    accept: "accepted",
    reject: "rejected",
    debit: "debit note raised for",
    grn: "GRN generated for",
  } as const;

  function act(action: keyof typeof actionVerbs, grn: Grn) {
    const mutation = {
      start: startReceiving,
      verify: verifyQuantity,
      qc: sendToQc,
      accept,
      reject,
      debit: raiseDebitNote,
      grn: generateGrn,
    }[action];
    mutation.mutate(grn.id, { onSuccess: () => pushToast(`${grn.id} ${actionVerbs[action]}`, "success") });
  }

  const actionList: { key: keyof typeof actionVerbs; label: string; mutation: { isPending: boolean } }[] = [
    { key: "start", label: "Start receiving", mutation: startReceiving },
    { key: "verify", label: "Verify quantity", mutation: verifyQuantity },
    { key: "qc", label: "Send to QC", mutation: sendToQc },
    { key: "accept", label: "Accept", mutation: accept },
    { key: "reject", label: "Reject", mutation: reject },
    { key: "debit", label: "Raise debit note", mutation: raiseDebitNote },
    { key: "grn", label: "Generate GRN", mutation: generateGrn },
  ];

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="inbound" />

      <div className={styles.headerRow}>
        <ViewToggle view={view} onChange={setView} />
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
      </div>

      {view === "list" ? (
        <RecordsListTable
          columns={GRN_COLUMNS}
          rows={grns.map(
            (g): WorkspaceRow => [g.id, g.supplier, g.sku, g.expected, g.received, g.accepted, g.rejected, g.status]
          )}
          onRowClick={(i) => {
            setSelectedId(grns[i]!.id);
            setView("workspace");
          }}
        />
      ) : (
      <div className={styles.board}>
        <Card className={styles.queueCard}>
          <div className={styles.queueTitle}>Inbound today</div>
          <div className={styles.queueList}>
            {grns.map((grn) => {
              const pct = 0;
              return (
                <button
                  key={grn.id}
                  type="button"
                  className={styles.queueRow}
                  data-selected={grn.id === selected?.id}
                  onClick={() => setSelectedId(grn.id)}
                >
                  <div className={styles.queueRefRow}>
                    <span className={styles.queueRef}>{grn.id}</span>
                    <Badge label={grn.status.label} tone={grn.status.tone} />
                  </div>
                  <div className={styles.queueMeta}>{grn.supplier}</div>
                  <div className={styles.queueBar}>
                    <div className={styles.queueBarFill} style={{ width: `${pct}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {selected ? (
          <div className={styles.mainRow}>
            <div className={styles.mainCol}>
              <Card className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <div>
                    <div className={styles.detailTitle}>{selected.id}</div>
                    <div className={styles.detailMeta}>{selected.supplier} · goods receipt verification</div>
                  </div>
                  <Badge label={selected.status.label} tone={selected.status.tone} />
                </div>

                <div className={styles.stepRow}>
                  {STEPS.map((step, i) => (
                    <div key={step} className={styles.step} data-done={i <= currentStep}>
                      <span className={styles.stepDot} />
                      <span className={styles.stepLabel}>{step}</span>
                    </div>
                  ))}
                </div>

                <div className={styles.totalsGrid}>
                  <div className={styles.totalCell}>
                    <span className={styles.totalValue}>{totals.expected || "—"}</span>
                    <span className={styles.totalLabel}>Expected</span>
                  </div>
                  <div className={styles.totalCell}>
                    <span className={styles.totalValue}>{totals.received || "—"}</span>
                    <span className={styles.totalLabel}>Received</span>
                  </div>
                  <div className={styles.totalCell}>
                    <span className={styles.totalValue}>{totals.accepted || "—"}</span>
                    <span className={styles.totalLabel}>Accepted</span>
                  </div>
                  <div className={styles.totalCell}>
                    <span className={styles.totalValue} data-tone={totals.rejected > 0 ? "red" : undefined}>
                      {totals.rejected || "—"}
                    </span>
                    <span className={styles.totalLabel}>Rejected</span>
                  </div>
                  <div className={styles.totalCell}>
                    <span className={styles.totalValue} data-tone={variance > 0 ? "amber" : undefined}>
                      {variance || "—"}
                    </span>
                    <span className={styles.totalLabel}>Variance</span>
                  </div>
                  <div className={styles.totalCell}>
                    <span className={styles.totalValue}>{fillRate}</span>
                    <span className={styles.totalLabel}>Fill rate</span>
                  </div>
                </div>
              </Card>

              <Card className={styles.linesCard}>
                <div className={styles.linesTitle}>Line verification — expected vs received</div>
                {lines.length > 0 ? (
                  <div className={styles.lineCards}>
                    {lines.map((line) => {
                      const short = line.expected - line.received;
                      const pct = line.expected > 0 ? Math.round((line.received / line.expected) * 100) : 0;
                      const flagged = short > 0 || line.rejected > 0;
                      const flagLabel = short > 0 ? `${short} short` : line.rejected > 0 ? `${line.rejected} rejected` : "Matches PO";
                      const barTone = line.received === line.expected ? "brand" : line.received === 0 ? "grey" : "amber";
                      return (
                        <div key={line.sku} className={styles.lineCard}>
                          <div className={styles.lineCardTop}>
                            <div>
                              <div className={styles.lineCardName}>{line.name}</div>
                              <div className={styles.lineCardMeta}>
                                {line.sku} · batch {line.batch}
                              </div>
                            </div>
                            <span className={styles.lineCardFlag} data-tone={flagged ? "red" : "green"}>
                              {flagLabel}
                            </span>
                          </div>
                          <div className={styles.lineBar}>
                            <div className={styles.lineBarFill} data-tone={barTone} style={{ width: `${pct}%` }} />
                          </div>
                          <div className={styles.lineFigs}>
                            <div>
                              <div className={styles.lineFigLabel}>Expected</div>
                              <div className={styles.lineFigValue}>{line.expected}</div>
                            </div>
                            <div>
                              <div className={styles.lineFigLabel}>Received</div>
                              <div className={styles.lineFigValue}>{line.received}</div>
                            </div>
                            <div>
                              <div className={styles.lineFigLabel}>Accepted</div>
                              <div className={styles.lineFigValue} data-tone="brand">
                                {line.accepted}
                              </div>
                            </div>
                            <div>
                              <div className={styles.lineFigLabel}>Rejected</div>
                              <div className={styles.lineFigValue} data-tone="red">
                                {line.rejected}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={styles.noLines}>No line items captured for this GRN yet.</p>
                )}
              </Card>
            </div>

            <Card className={styles.actionsCard}>
              <div className={styles.actionsTitle}>Receiving actions</div>
              <div className={styles.actionsHint}>Each step is recorded against the GRN and written to the audit log.</div>
              <div className={styles.actionsList}>
                {canApprove ? (
                  actionList.map((a) => (
                    <button
                      key={a.key}
                      type="button"
                      className={styles.actionBtn}
                      disabled={a.mutation.isPending}
                      onClick={() => act(a.key, selected)}
                    >
                      {a.label}
                    </button>
                  ))
                ) : (
                  <p className={styles.noLines}>You don't have permission to act on this GRN.</p>
                )}
              </div>
            </Card>
          </div>
        ) : (
          <EmptyState title="No GRNs in the receiving queue" />
        )}
      </div>
      )}
    </div>
  );
}
