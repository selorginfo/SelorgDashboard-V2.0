import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { putawayService } from "@/services/warehouse";

const KEY = ["warehouse-putaway-tasks"];

export function usePutawayTasks() {
  return useQuery({ queryKey: KEY, queryFn: () => putawayService.list() });
}

export function useConfirmPutaway() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigned }: { id: string; assigned: string }) => putawayService.confirm(id, assigned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRaiseMismatch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, assigned }: { id: string; assigned: string }) => putawayService.raiseMismatch(id, assigned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
