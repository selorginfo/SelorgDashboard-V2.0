import { api } from "@/lib/apiClient";
import type { ApprovalApplication, WorkerKind } from "@/types/approval";
import type { Badge } from "@/types/common";
import type { ApprovalService, ApprovalDecision } from "./approvalService";

function pathForKind(kind: WorkerKind): string {
  return kind === "rider" ? "/api/v1/admin/riders" : "/api/v1/admin/picker/approvals";
}

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "riders", "approvals", "applications"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "pending").toLowerCase();
  if (s.includes("approv") || s === "active") return { label: "Approved", tone: "green" };
  if (s.includes("reject")) return { label: "Rejected", tone: "red" };
  if (s.includes("document") || s.includes("info")) return { label: "Documents required", tone: "amber" };
  if (s.includes("sla")) return { label: "SLA breached", tone: "red" };
  if (s.includes("review")) return { label: "Needs review", tone: "amber" };
  return { label: "Needs review", tone: "amber" };
}

function mapApplication(raw: Record<string, unknown>, index: number): ApprovalApplication {
  const status = statusBadge(raw.status ?? raw.approvalStatus ?? raw.verificationStatus);
  const appliedRaw = raw.applied ?? raw.appliedAt ?? raw.createdAt ?? raw.submittedAt;
  let applied = "—";
  if (appliedRaw) {
    const d = new Date(String(appliedRaw));
    applied = Number.isNaN(d.getTime()) ? String(appliedRaw) : d.toLocaleString("en-IN");
  }
  const notesRaw = raw.notes;
  const notes = Array.isArray(notesRaw)
    ? notesRaw.map((n) => (typeof n === "string" ? n : String((n as { text?: string }).text ?? n)))
    : typeof notesRaw === "string" && notesRaw
      ? [notesRaw]
      : [];

  return {
    id: String(raw.id ?? raw._id ?? raw.applicationId ?? `APP-${index}`),
    applicant: String(raw.applicant ?? raw.name ?? raw.fullName ?? raw.riderName ?? raw.pickerName ?? "Applicant"),
    applied,
    location: String(raw.location ?? raw.zone ?? raw.preferredStore ?? raw.darkStore ?? raw.hub ?? "—"),
    verification: String(raw.verification ?? raw.kycStatus ?? raw.identityStatus ?? "Pending"),
    detail: String(raw.detail ?? raw.vehicleCheck ?? raw.shiftPreference ?? raw.vehicle ?? "Pending"),
    reviewer: String(raw.reviewer ?? raw.assignedTo ?? raw.reviewerName ?? "Unassigned"),
    status,
    notes,
  };
}

function decisionToApi(decision: ApprovalDecision): string {
  const d = String(decision).toLowerCase();
  if (d.includes("approve")) return "approve";
  if (d.includes("reject")) return "reject";
  if (d.includes("request") || d.includes("information")) return "request_information";
  if (d.includes("start") || d.includes("review")) return "start_review";
  return d;
}

export const realApprovalService: ApprovalService = {
  async list(kind: WorkerKind): Promise<ApprovalApplication[]> {
    const res = await api.get<unknown>(pathForKind(kind));
    return extractList(res).map(mapApplication);
  },

  async decide(kind: WorkerKind, id: string, decision: ApprovalDecision, note: string): Promise<ApprovalApplication> {
    const apiDecision = decisionToApi(decision);
    if (kind === "rider") {
      const status =
        apiDecision === "approve"
          ? "approved"
          : apiDecision === "reject"
            ? "rejected"
            : apiDecision === "request_information"
              ? "documents_required"
              : "under_review";
      const res = await api.patch<Record<string, unknown>>(`/api/v1/admin/riders/${id}/status`, { status, note });
      return mapApplication(res && typeof res === "object" ? res : { id, status }, 0);
    }
    const res = await api.post<Record<string, unknown>>(`/api/v1/admin/picker/approvals/${id}/decision`, {
      decision: apiDecision,
      note,
    });
    return mapApplication(res && typeof res === "object" ? res : { id, status: apiDecision }, 0);
  },

  async assignReviewer(kind: WorkerKind, id: string, reviewer: string): Promise<ApprovalApplication> {
    const res = await api.patch<Record<string, unknown>>(`${pathForKind(kind)}/${id}`, { reviewer });
    return mapApplication(res && typeof res === "object" ? res : { id, reviewer }, 0);
  },
};
