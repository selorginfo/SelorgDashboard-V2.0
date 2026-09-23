import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { payoutsService } from "@/services/workforce";

const KEY = ["workforce-payouts"];

export function usePayouts() {
  return useQuery({ queryKey: KEY, queryFn: () => payoutsService.list() });
}

export function useApprovePayoutRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => payoutsService.approveRun(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
