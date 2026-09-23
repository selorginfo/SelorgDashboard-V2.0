import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { earningRuleService } from "@/services/earningRules";
import type { EarningRuleAction } from "@/services/earningRules/earningRuleService";

const KEY = ["earning-rules"];

export function useEarningRules() {
  return useQuery({ queryKey: KEY, queryFn: () => earningRuleService.list() });
}

export function useEarningRuleAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: EarningRuleAction }) => earningRuleService.applyAction(id, action),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
