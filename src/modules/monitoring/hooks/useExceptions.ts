import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exceptionsService } from "@/services/monitoring";

const KEY = ["monitoring-exceptions"];

export function useExceptions() {
  return useQuery({ queryKey: KEY, queryFn: () => exceptionsService.list() });
}

export function useAssignException() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, owner }: { id: string; owner: string }) => exceptionsService.assignOwner(id, owner),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
