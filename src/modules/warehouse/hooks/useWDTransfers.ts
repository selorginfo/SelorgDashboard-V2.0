import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wdTransferService } from "@/services/warehouse/wdTransferService";

export function useWDTransferLogs(id: string, enabled = false) {
  return useQuery({
    queryKey: ["wd-transfer-logs", "warehouse", id],
    queryFn: () => wdTransferService.fetchLogs(id, "warehouse"),
    enabled: !!id && enabled,
  });
}

const KEY = ["wd-transfer-requests"];

export function useWDTransferRequests(status?: string) {
  return useQuery({
    queryKey: [...KEY, status],
    queryFn: () => wdTransferService.listIncoming(status ? { status } : undefined),
  });
}

export function useAcceptWDTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items?: Array<{ sku: string; approved_qty: number }> }) =>
      wdTransferService.accept(id, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRejectWDTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) => wdTransferService.reject(id, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function usePackWDTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items?: Array<{ sku: string; packed_qty: number }> }) =>
      wdTransferService.pack(id, items),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useDispatchWDTransfer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      details,
    }: {
      id: string;
      details?: { driver_name?: string; driver_phone?: string; vehicle_no?: string; notes?: string };
    }) => wdTransferService.dispatch(id, details),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
