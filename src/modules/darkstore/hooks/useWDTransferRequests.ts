import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wdTransferService } from "@/services/warehouse/wdTransferService";

export function useDarkstoreWDTransferLogs(id: string, storeId: string, enabled = false) {
  return useQuery({
    queryKey: ["wd-transfer-logs", "darkstore", id],
    queryFn: () => wdTransferService.fetchLogs(id, "darkstore", storeId),
    enabled: !!id && enabled,
  });
}

function key(storeId: string) {
  return ["ds-wd-transfer-requests", storeId];
}

export function useDarkstoreWDRequests(storeId: string, status?: string) {
  return useQuery({
    queryKey: [...key(storeId), status],
    queryFn: () => wdTransferService.listMyRequests(storeId, status ? { status } : undefined),
    enabled: !!storeId,
  });
}

export function useCreateWDTransferRequest(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      warehouse_id: string;
      items: Array<{ product_id?: string; product_name?: string; sku: string; requested_qty: number }>;
      notes?: string;
    }) => wdTransferService.createRequest({ ...payload, storeId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: key(storeId) }),
  });
}

export function useReceiveWDTransfer(storeId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }: { id: string; items?: Array<{ sku: string; received_qty: number }> }) =>
      wdTransferService.receive(id, storeId, items),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key(storeId) });
      qc.invalidateQueries({ queryKey: ["ds-inventory-all"] });
    },
  });
}
