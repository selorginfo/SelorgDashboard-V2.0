import { useQuery } from "@tanstack/react-query";
import { adminOpsService } from "@/services/adminOps";
import type { OpsRangeQuery } from "@/types/adminOps";

export function useRiderDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-ops", "rider", id],
    queryFn: () => adminOpsService.getRiderDetail(id!),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useRiderStats(id: string | undefined, range: OpsRangeQuery) {
  return useQuery({
    queryKey: ["admin-ops", "rider-stats", id, range.range, range.from, range.to],
    queryFn: () => adminOpsService.getRiderStats(id!, range),
    enabled: Boolean(id),
    retry: false,
  });
}

export function usePickerDetail(id: string | undefined) {
  return useQuery({
    queryKey: ["admin-ops", "picker", id],
    queryFn: () => adminOpsService.getPickerDetail(id!),
    enabled: Boolean(id),
    retry: false,
  });
}

export function usePickerStats(id: string | undefined, range: OpsRangeQuery) {
  return useQuery({
    queryKey: ["admin-ops", "picker-stats", id, range.range, range.from, range.to],
    queryFn: () => adminOpsService.getPickerStats(id!, range),
    enabled: Boolean(id),
    retry: false,
  });
}

export function useCodCollection(range: OpsRangeQuery) {
  return useQuery({
    queryKey: ["admin-ops", "cod", range.range, range.from, range.to],
    queryFn: () => adminOpsService.getCodCollection(range),
    retry: false,
  });
}

export function useCodRiderTransfers(range: OpsRangeQuery) {
  return useQuery({
    queryKey: ["admin-ops", "cod-transfers", range.range, range.from, range.to],
    queryFn: () => adminOpsService.getCodRiderTransfers(range),
    retry: false,
  });
}

export function useOrderProgress(filters: { status?: string; store?: string }) {
  return useQuery({
    queryKey: ["admin-ops", "order-progress", filters.status, filters.store],
    queryFn: () => adminOpsService.getOrderProgress(filters),
    retry: false,
  });
}

export function useCustomerReviews(filters: { rating?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ["admin-ops", "reviews", filters.rating, filters.from, filters.to],
    queryFn: () => adminOpsService.getCustomerReviews(filters),
    retry: false,
  });
}

export function useHsdDevices() {
  return useQuery({
    queryKey: ["admin-ops", "hsd-devices"],
    queryFn: () => adminOpsService.getHsdDevices(),
    retry: false,
  });
}

export function useHsdDeviceHistory(id: string | undefined, range: OpsRangeQuery) {
  return useQuery({
    queryKey: ["admin-ops", "hsd-history", id, range.range, range.from, range.to],
    queryFn: () => adminOpsService.getHsdDeviceHistory(id!, range),
    enabled: Boolean(id),
    retry: false,
  });
}
