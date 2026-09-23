import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { earningsService } from "@/services/workforce";
import type { WorkerKind } from "@/types/workforce";

const key = (kind: WorkerKind) => ["workforce-earnings", kind];

export function useEarnings(kind: WorkerKind) {
  return useQuery({ queryKey: key(kind), queryFn: () => earningsService.list(kind) });
}

export function useApproveEarning(kind: WorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => earningsService.approve(kind, id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}
