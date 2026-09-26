import { useMemo, useState } from "react";
import { CheckCircle2, XCircle, MessageCircleQuestion, UserPlus, ExternalLink, FileText } from "lucide-react";
import {
  useApplications,
  useDecideApplication,
  useAssignReviewer,
  useReviewDocument,
  useApplicationDocuments,
} from "@/modules/approvals/hooks/useApprovals";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import { usePermission } from "@/hooks/usePermission";
import type { ApprovalDocument, WorkerKind } from "@/types/approval";
import type { ModuleId } from "@/constants/nav";
import styles from "./ApprovalWorkspacePage.module.css";

const REVIEWERS_BY_KIND: Record<WorkerKind, string[]> = {
  rider: ["Rider Ops · Desk A", "Rider Ops · Desk B"],
  picker: ["Store Ops · Desk A", "Store Ops · Desk B", "Store Ops · Desk C"],
};

const LABELS: Record<WorkerKind, { location: string; verification: string; detail: string; moduleId: ModuleId }> = {
  rider: { location: "Zone", verification: "KYC", detail: "Vehicle check", moduleId: "rider-approvals" },
  picker: { location: "Preferred store", verification: "Identity", detail: "Shift preference", moduleId: "picker-approvals" },
};

const TABS = ["Interview", "Documents required", "Approved", "Rejected"];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function tabFor(status: string): string {
  if (status === "Approved") return "Approved";
  if (status === "Rejected") return "Rejected";
  if (status === "Documents required") return "Documents required";
  return "Interview";
}

function docLabel(doc: ApprovalDocument): string {
  const type = doc.type.replace(/_/g, " ").toUpperCase();
  return doc.side ? `${type} · ${doc.side}` : type;
}

function isImageUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url) || url.includes("placehold.co") || url.includes("image");
}

function isPdfUrl(url: string | null): boolean {
  if (!url) return false;
  return /\.pdf(\?|$)/i.test(url) || url.toLowerCase().includes("application/pdf");
}

export function ApprovalWorkspacePage({ kind }: { kind: WorkerKind }) {
  const { data: applications, isLoading, isError, refetch } = useApplications(kind);
  const [tab, setTab] = useState(TABS[0] as string);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [note, setNote] = useState("");
  const [previewDocId, setPreviewDocId] = useState<string | undefined>(undefined);
  const decide = useDecideApplication(kind);
  const reviewDoc = useReviewDocument(kind);
  const assignReviewer = useAssignReviewer(kind);
  const pushToast = useUiStore((s) => s.pushToast);
  const { can } = usePermission();
  const labels = LABELS[kind];

  const filtered = useMemo(
    () => (applications ?? []).filter((a) => tabFor(a.status?.label ?? "") === tab),
    [applications, tab],
  );
  const selected =
    applications?.find((a) => a.id === selectedId) ??
    filtered[0] ??
    applications?.find((a) => tabFor(a.status?.label ?? "") === "Interview") ??
    applications?.[0];

  const { data: liveDocuments } = useApplicationDocuments(kind, selected?.id);
  const documents = liveDocuments ?? selected?.documents ?? [];

  const previewDoc =
    documents.find((d) => d.id === previewDocId) ??
    documents.find((d) => d.url) ??
    documents[0];

  if (isLoading) return <CardSkeleton />;
  if (isError || !applications) {
    return <ErrorState message="Couldn't load applications." onRetry={() => refetch()} />;
  }

  const interviewCount = applications.filter((a) => tabFor(a.status?.label ?? "") === "Interview").length;
  const docsRequired = applications.filter((a) => a.status?.label === "Documents required").length;
  const approvedCount = applications.filter((a) => a.status?.label === "Approved").length;
  const rejectedCount = applications.filter((a) => a.status?.label === "Rejected").length;

  const decided = applications.filter((a) => a.status?.label === "Approved" || a.status?.label === "Rejected");
  const avgDecisionLabel =
    decided.length === 0 ? "—" : decided.length < 3 ? "< 1 day" : `${Math.max(1, Math.round(decided.length / 4))}d`;

  const canApprove = can(labels.moduleId, "approve");

  const checks = selected
    ? [
        { label: labels.verification, passed: selected.verification === "Verified" },
        { label: labels.detail, passed: selected.detail === "Verified" },
        {
          label: "Documents uploaded",
          passed: documents.length > 0,
        },
      ]
    : [];
  const checksPassed = checks.filter((c) => c.passed).length;
  const totalChecks = checks.length || 1;

  function decideWith(decision: "Approve" | "Reject" | "Request information" | "Start review") {
    if (!selected) return;
    if (decision === "Reject" && !note.trim()) {
      pushToast("Write a rejection reason so the applicant can fix and resubmit", "error");
      return;
    }
    decide.mutate(
      { id: selected.id, decision, note },
      {
        onSuccess: () => {
          pushToast(`${selected.applicant} — ${decision.toLowerCase()}d`, "success");
          setNote("");
        },
        onError: (err) => pushToast(err instanceof Error ? err.message : "Couldn't record the decision", "error"),
      },
    );
  }

  function reviewDocument(doc: ApprovalDocument, status: "approved" | "rejected") {
    if (status === "rejected" && !note.trim()) {
      pushToast("Write a reason before rejecting a document", "error");
      return;
    }
    reviewDoc.mutate(
      { documentId: doc.id, status, rejectionReason: note.trim() },
      {
        onSuccess: () => {
          pushToast(`${docLabel(doc)} ${status}`, "success");
          if (status === "rejected") setNote("");
        },
        onError: (err) => pushToast(err instanceof Error ? err.message : "Couldn't review document", "error"),
      },
    );
  }

  const decisionToolbar = (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
      <Button size="sm" variant="ghost" onClick={() => refetch()}>
        Refresh
      </Button>
      <Button
        size="sm"
        variant="primary"
        disabled={!selected || !canApprove || decide.isPending}
        isLoading={decide.isPending}
        onClick={() => decideWith("Approve")}
      >
        <CheckCircle2 size={13} /> Approve
      </Button>
      <Button size="sm" disabled={!selected || decide.isPending} onClick={() => decideWith("Reject")}>
        <XCircle size={13} /> Reject
      </Button>
      <Button size="sm" disabled={!selected || decide.isPending} onClick={() => decideWith("Request information")}>
        <MessageCircleQuestion size={13} /> Request information
      </Button>
      <Button size="sm" disabled={!selected || decide.isPending} onClick={() => decideWith("Start review")}>
        Start interview review
      </Button>
      {can(labels.moduleId, "assign") ? (
        <Button
          size="sm"
          disabled={!selected || assignReviewer.isPending}
          onClick={() => {
            if (!selected) return;
            assignReviewer.mutate(
              { id: selected.id, reviewer: REVIEWERS_BY_KIND[kind][0] as string },
              { onSuccess: () => pushToast("Reviewer assigned", "success") },
            );
          }}
        >
          <UserPlus size={13} /> Assign reviewer
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className={styles.wrap}>
      <KpiStrip
        moduleId={labels.moduleId}
        kpis={[
          { value: String(interviewCount), label: "In interview", color: interviewCount ? "var(--amber-tx)" : undefined },
          { value: String(docsRequired), label: "Documents required", color: docsRequired ? "var(--red-tx)" : undefined },
          { value: String(approvedCount), label: "Approved" },
          { value: String(rejectedCount), label: "Rejected" },
          { value: avgDecisionLabel, label: "Avg decision time" },
        ]}
      />

      {decisionToolbar}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`No applications in "${tab}"`} />
      ) : (
        <div className={styles.board}>
          <Card className={styles.queue}>
            <div className={styles.queueTitle}>Approval queue</div>
            {filtered.map((a) => (
              <button
                key={a.id}
                type="button"
                className={styles.queueRow}
                data-tone={a.status?.tone}
                data-selected={a.id === selected?.id}
                onClick={() => {
                  setSelectedId(a.id);
                  setNote("");
                  setPreviewDocId(undefined);
                }}
              >
                <span className={styles.queueAvatar}>{initials(a.applicant || "?")}</span>
                <div className={styles.queueBody}>
                  <div className={styles.queueTop}>
                    <span className={styles.queueName}>{a.applicant}</span>
                  </div>
                  <div className={styles.queueMeta}>
                    {a.id} · {a.applied}
                  </div>
                  <Badge label={a.status?.label ?? "Interview"} tone={a.status?.tone ?? "amber"} />
                </div>
              </button>
            ))}
          </Card>

          {selected ? (
            <Card className={styles.detail}>
              <div className={styles.detailHeader}>
                <span className={styles.detailAvatar}>{initials(selected.applicant || "?")}</span>
                <div className={styles.detailHeaderBody}>
                  <div className={styles.applicantName}>{selected.applicant}</div>
                  <div className={styles.applicantId}>{selected.id}</div>
                </div>
                <Badge label={selected.status?.label ?? "Interview"} tone={selected.status?.tone ?? "amber"} />
              </div>

              <div className={styles.fields}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Application</span>
                  <span className={styles.fieldValue}>{selected.id}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Applicant</span>
                  <span className={styles.fieldValue}>{selected.applicant}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Applied</span>
                  <span className={styles.fieldValue}>{selected.applied}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{labels.location}</span>
                  <span className={styles.fieldValue}>{selected.location}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{labels.verification}</span>
                  <span className={styles.fieldValue} data-warn={selected.verification !== "Verified"}>
                    {selected.verification}
                  </span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>{labels.detail}</span>
                  <span className={styles.fieldValue}>{selected.detail}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Reviewer</span>
                  <span className={styles.fieldValue}>{selected.reviewer}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Status</span>
                  <span className={styles.fieldValue}>{selected.status?.label}</span>
                </div>
              </div>

              <div className={styles.docsSection}>
                <div className={styles.verificationHeader}>
                  <span>Verification documents</span>
                  <span className={styles.verificationCount}>{documents.length} uploaded</span>
                </div>
                {documents.length === 0 ? (
                  <div className={styles.docsEmpty}>No documents uploaded yet.</div>
                ) : (
                  <div className={styles.docsLayout}>
                    <div className={styles.docList}>
                      {documents.map((doc) => (
                        <button
                          key={doc.id}
                          type="button"
                          className={styles.docRow}
                          data-selected={previewDoc?.id === doc.id}
                          onClick={() => setPreviewDocId(doc.id)}
                        >
                          <FileText size={14} />
                          <div className={styles.docRowBody}>
                            <span className={styles.docName}>{docLabel(doc)}</span>
                            <span className={styles.docMeta}>{doc.fileName || doc.id}</span>
                          </div>
                          <Badge
                            label={doc.status === "approved" ? "Approved" : doc.status === "rejected" ? "Rejected" : "Pending"}
                            tone={doc.status === "approved" ? "green" : doc.status === "rejected" ? "red" : "amber"}
                          />
                        </button>
                      ))}
                    </div>
                    <div className={styles.docPreview}>
                      {previewDoc?.url ? (
                        <>
                          {isImageUrl(previewDoc.url) ? (
                            <img src={previewDoc.url} alt={docLabel(previewDoc)} className={styles.docImage} />
                          ) : isPdfUrl(previewDoc.url) ? (
                            <iframe title={docLabel(previewDoc)} src={previewDoc.url} className={styles.docFrame} />
                          ) : (
                            <div className={styles.docsEmpty}>
                              Preview not available for this file type. Open in a new tab.
                            </div>
                          )}
                          <div className={styles.docActions}>
                            <a href={previewDoc.url} target="_blank" rel="noreferrer" className={styles.docOpen}>
                              <ExternalLink size={13} /> Open full document
                            </a>
                            <Button
                              size="sm"
                              variant="primary"
                              disabled={reviewDoc.isPending}
                              onClick={() => reviewDocument(previewDoc, "approved")}
                            >
                              Approve doc
                            </Button>
                            <Button
                              size="sm"
                              variant="danger"
                              disabled={reviewDoc.isPending}
                              onClick={() => reviewDocument(previewDoc, "rejected")}
                            >
                              Reject doc
                            </Button>
                          </div>
                          {previewDoc.rejectionReason ? (
                            <div className={styles.docRejectReason}>Rejected: {previewDoc.rejectionReason}</div>
                          ) : null}
                        </>
                      ) : (
                        <div className={styles.docsEmpty}>Select a document to preview.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.verification}>
                <div className={styles.verificationHeader}>
                  <span>Verification</span>
                  <span className={styles.verificationCount} data-complete={checksPassed === totalChecks}>
                    {checksPassed} of {totalChecks} checks passed
                  </span>
                </div>
                <div className={styles.checklist}>
                  {checks.map((c) => (
                    <div key={c.label} className={styles.checkRow}>
                      {c.passed ? <CheckCircle2 size={14} className={styles.checkIconPass} /> : <XCircle size={14} className={styles.checkIconFail} />}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {(selected.notes?.length ?? 0) > 0 ? (
                <div className={styles.notes}>
                  {selected.notes.map((n, i) => (
                    <div key={i} className={styles.noteRow}>
                      {n}
                    </div>
                  ))}
                </div>
              ) : null}

              {can(labels.moduleId, "assign") ? (
                <div className={styles.assignRow}>
                  <span className={styles.fieldLabel}>Assign reviewer</span>
                  <Select
                    value={selected.reviewer}
                    onValueChange={(v) =>
                      assignReviewer.mutate(
                        { id: selected.id, reviewer: v },
                        { onSuccess: () => pushToast(`Assigned to ${v}`, "success") },
                      )
                    }
                    options={REVIEWERS_BY_KIND[kind].map((r) => ({ value: r, label: r }))}
                  />
                </div>
              ) : null}

              <textarea
                className={styles.noteInput}
                placeholder="Rejection / decision reason (required when rejecting — shown to the applicant)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </Card>
          ) : null}

          {selected ? (
            <Card className={styles.decisionPanel}>
              <div className={styles.decisionTitle}>Decision</div>
              {checksPassed === totalChecks ? (
                <div className={styles.decisionBanner} data-tone="green">
                  Documents are ready — approve to unlock the {kind} app home screen.
                </div>
              ) : (
                <div className={styles.decisionBanner} data-tone="amber">
                  Applicant stays on the Interview screen until you approve.
                </div>
              )}

              <Button
                variant="primary"
                onClick={() => decideWith("Approve")}
                isLoading={decide.isPending}
                disabled={!canApprove}
                className={styles.decisionBtn}
              >
                <CheckCircle2 size={14} /> Approve {kind}
              </Button>
              <Button onClick={() => decideWith("Start review")} isLoading={decide.isPending} className={styles.decisionBtn}>
                Start interview review
              </Button>
              <Button onClick={() => decideWith("Request information")} isLoading={decide.isPending} className={styles.decisionBtn}>
                <MessageCircleQuestion size={14} /> Request information
              </Button>
              <div className={styles.dangerZone}>
                <div className={styles.dangerLabel}>Danger zone</div>
                <p className={styles.dangerNote}>Rejecting requires a written reason. The {kind} can resubmit after fixing documents.</p>
                <Button variant="danger" onClick={() => decideWith("Reject")} isLoading={decide.isPending} className={styles.decisionBtn}>
                  <XCircle size={14} /> Reject application
                </Button>
              </div>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
