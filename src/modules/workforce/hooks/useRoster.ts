import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { rosterService } from "@/services/workforce";

const KEY = ["workforce-roster"];

export function useRoster() {
  return useQuery({ queryKey: KEY, queryFn: () => rosterService.list() });
}

export function useApproveSwap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rosterService.approveSwap(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useFillGap() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => rosterService.fillGap(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
