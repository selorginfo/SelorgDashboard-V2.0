import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { vendorService } from "@/services/vendors";
import type { Vendor } from "@/types/vendor";
import type { CreateVendorInput } from "@/services/vendors/vendorService";

const KEY = ["vendors"];

export function useVendors() {
  return useQuery({ queryKey: KEY, queryFn: () => vendorService.list() });
}

export function useSetVendorStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: Vendor["status"] }) => vendorService.setStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useCreateVendor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVendorInput) => vendorService.create(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useRecordVendorQualityIssue() {
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => vendorService.recordQualityIssue(id, notes),
  });
}

export function useRequestVendorDocuments() {
  return useMutation({
    mutationFn: ({ id, note }: { id: string; note?: string }) => vendorService.requestDocuments(id, note),
  });
}

export function useVendorPerformance(id: string | undefined) {
  return useQuery({
    queryKey: ["vendor-performance", id],
    queryFn: () => vendorService.getPerformance(id!),
    enabled: Boolean(id),
    staleTime: 60_000,
  });
}
