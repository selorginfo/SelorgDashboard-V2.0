import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_RIDER_APPLICATIONS, SEED_PICKER_APPLICATIONS } from "@/services/approvals/seed";
import type { ApprovalApplication, WorkerKind } from "@/types/approval";
import type { ApprovalService } from "@/services/approvals/approvalService";

const riderTable = createMockTable<ApprovalApplication>("selorg.approvals.rider", SEED_RIDER_APPLICATIONS);
const pickerTable = createMockTable<ApprovalApplication>("selorg.approvals.picker", SEED_PICKER_APPLICATIONS);

function tableFor(kind: WorkerKind) {
  return kind === "rider" ? riderTable : pickerTable;
}

function updateApplication(kind: WorkerKind, id: string, patch: Partial<ApprovalApplication>): ApprovalApplication {
  let updated: ApprovalApplication | undefined;
  tableFor(kind).update((rows) =>
    rows.map((a) => {
      if (a.id !== id) return a;
      updated = { ...a, ...patch };
      return updated;
    })
  );
  if (!updated) throw new MockApiError(`Application ${id} not found`);
  return updated;
}

export const mockApprovalService: ApprovalService = {
  async list(kind) {
    await mockDelay();
    return tableFor(kind).all();
  },

  async decide(kind, id, decision, note) {
    await mockDelay(300);
    if (decision === "Reject" && !String(note || "").trim()) {
      throw new MockApiError("A rejection reason is required");
    }
    const application = tableFor(kind).all().find((a) => a.id === id);
    if (!application) throw new MockApiError(`Application ${id} not found`);
    const status =
      decision === "Approve"
        ? { label: "Approved", tone: "green" as const }
        : decision === "Reject"
          ? { label: "Rejected", tone: "grey" as const }
          : decision === "Start review"
            ? { label: "Interview", tone: "amber" as const }
            : { label: "Documents required", tone: "red" as const };
    const notes = note ? [...application.notes, note] : application.notes;
    return updateApplication(kind, id, { status, notes });
  },

  async assignReviewer(kind, id, reviewer) {
    await mockDelay(220);
    return updateApplication(kind, id, { reviewer, status: { label: "Interview", tone: "amber" } });
  },

  async getDocuments(kind, id) {
    await mockDelay(120);
    return tableFor(kind).all().find((a) => a.id === id)?.documents ?? [];
  },

  async reviewDocument(kind, documentId, status, rejectionReason) {
    await mockDelay(200);
    if (status === "rejected" && !String(rejectionReason || "").trim()) {
      throw new MockApiError("A rejection reason is required");
    }
    const table = tableFor(kind);
    table.update((rows) =>
      rows.map((a) => ({
        ...a,
        documents: (a.documents || []).map((d) =>
          d.id === documentId
            ? {
                ...d,
                status,
                rejectionReason: status === "rejected" ? rejectionReason : null,
              }
            : d,
        ),
      })),
    );
  },
};
