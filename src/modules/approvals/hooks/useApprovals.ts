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

export function useAssignReviewer(kind: WorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reviewer }: { id: string; reviewer: string }) => approvalService.assignReviewer(kind, id, reviewer),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}
