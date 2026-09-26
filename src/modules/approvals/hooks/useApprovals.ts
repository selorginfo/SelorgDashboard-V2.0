import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { approvalService } from "@/services/approvals";
import type { ApprovalDecision } from "@/services/approvals/approvalService";
import type { WorkerKind } from "@/types/approval";

const key = (kind: WorkerKind) => ["approvals", kind];

export function useApplications(kind: WorkerKind) {
  return useQuery({ queryKey: key(kind), queryFn: () => approvalService.list(kind) });
}

export function useDecideApplication(kind: WorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision, note }: { id: string; decision: ApprovalDecision; note: string }) =>
      approvalService.decide(kind, id, decision, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}

export function useReviewDocument(kind: WorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      documentId,
      status,
      rejectionReason,
    }: {
      documentId: string;
      status: "approved" | "rejected";
      rejectionReason: string;
    }) => {
      if (!approvalService.reviewDocument) {
        return Promise.reject(new Error("Document review is not available"));
      }
      return approvalService.reviewDocument(kind, documentId, status, rejectionReason);
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: key(kind) });
      queryClient.invalidateQueries({ queryKey: [...key(kind), "documents"] });
      void vars;
    },
  });
}

export function useApplicationDocuments(kind: WorkerKind, applicationId: string | undefined) {
  return useQuery({
    queryKey: [...key(kind), "documents", applicationId],
    enabled: Boolean(applicationId),
    queryFn: async () => {
      if (!applicationId) return [];
      if (approvalService.getDocuments) {
        return approvalService.getDocuments(kind, applicationId);
      }
      const apps = await approvalService.list(kind);
      return apps.find((a) => a.id === applicationId)?.documents ?? [];
    },
  });
}

export function useAssignReviewer(kind: WorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewer }: { id: string; reviewer: string }) => approvalService.assignReviewer(kind, id, reviewer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}
