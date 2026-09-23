import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cxTicketService } from "@/services/commerce";
import type { Badge } from "@/types/common";

const KEY = ["commerce-support-tickets"];

export function useCxTickets() {
  return useQuery({ queryKey: KEY, queryFn: () => cxTicketService.list() });
}

export function useReplyToCxTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text }: { id: string; text: string }) => cxTicketService.reply(id, text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetCxTicketStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Badge }) => cxTicketService.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAssignCxAgent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, agent }: { id: string; agent: string }) => cxTicketService.assignAgent(id, agent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRefundCxTicket() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, amount, reason }: { id: string; amount?: number; reason?: string }) =>
      cxTicketService.refund(id, amount, reason),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
