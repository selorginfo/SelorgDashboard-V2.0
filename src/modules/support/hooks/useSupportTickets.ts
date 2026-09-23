import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supportTicketService } from "@/services/support";
import type { SupportTicket, SupportWorkerKind } from "@/types/supportTicket";

const key = (kind: SupportWorkerKind) => ["support-tickets", kind];

export function useSupportTickets(kind: SupportWorkerKind) {
  return useQuery({ queryKey: key(kind), queryFn: () => supportTicketService.list(kind) });
}

export function useReplyToTicket(kind: SupportWorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, text, internal }: { id: string; text: string; internal: boolean }) =>
      supportTicketService.reply(kind, id, text, internal),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}

export function useAssignAgent(kind: SupportWorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, agent }: { id: string; agent: string }) => supportTicketService.assignAgent(kind, id, agent),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}

export function useSetTicketStatus(kind: SupportWorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicket["status"] }) =>
      supportTicketService.setStatus(kind, id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}

export function useCreateTicket(kind: SupportWorkerKind) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: {
      subject: string;
      description?: string;
      category?: string;
      priority?: string;
      customerName: string;
      customerEmail: string;
    }) => supportTicketService.create(kind, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key(kind) }),
  });
}
