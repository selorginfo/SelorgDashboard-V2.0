import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { directoryService } from "@/services/workforce";
import type { Badge } from "@/types/common";
import type { WorkerKind } from "@/types/workforce";

const key = (kind: WorkerKind) => ["workforce-directory", kind];

export function useDirectory(kind: WorkerKind) {
  return useQuery({ queryKey: key(kind), queryFn: () => directoryService.list(kind) });
}

export function useSetPersonStatus(kind: WorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, tab }: { id: string; status: Badge; tab: string }) =>
      directoryService.setStatus(kind, id, status, tab),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}
