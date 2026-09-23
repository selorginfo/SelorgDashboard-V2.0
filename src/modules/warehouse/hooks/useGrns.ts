import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { grnService } from "@/services/warehouse";

const KEY = ["warehouse-grns"];

export function useGrns() {
  return useQuery({ queryKey: KEY, queryFn: () => grnService.list() });
}

export function useStartReceivingGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.startReceiving(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useVerifyQuantityGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.verifyQuantity(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSendToQcGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.sendToQc(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useGenerateGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.generateGrn(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAcceptGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.accept(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRejectGrn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.reject(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRaiseDebitNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => grnService.raiseDebitNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
