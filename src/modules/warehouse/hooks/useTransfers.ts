import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { transferService } from "@/services/warehouse";
import type { CreateTransferInput } from "@/services/warehouse/transferService";

const KEY = ["warehouse-transfers"];

export function useTransfers() {
  return useQuery({ queryKey: KEY, queryFn: () => transferService.list() });
}

export function useAdvanceTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transferService.advance(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateTransfer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransferInput) => transferService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
