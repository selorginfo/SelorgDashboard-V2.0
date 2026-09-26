import type { ApprovalApplication, ApprovalDocument, WorkerKind } from "@/types/approval";

export type ApprovalDecision = "Approve" | "Reject" | "Request information" | "Start review";

export interface ApprovalService {
  list(kind: WorkerKind): Promise<ApprovalApplication[]>;
  decide(kind: WorkerKind, id: string, decision: ApprovalDecision, note: string): Promise<ApprovalApplication>;
  assignReviewer(kind: WorkerKind, id: string, reviewer: string): Promise<ApprovalApplication>;
  getDocuments?(kind: WorkerKind, id: string): Promise<ApprovalDocument[]>;
  reviewDocument?(
    kind: WorkerKind,
    documentId: string,
    status: "approved" | "rejected",
    rejectionReason: string,
  ): Promise<void>;
}
