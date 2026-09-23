import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bulkOrderService } from "@/services/bulkOrders/bulkOrderService";
import { useSessionStore } from "@/store/sessionStore";
import type { AdminUser } from "@/types/auth";
import type { BulkOrderStatus, BulkPaymentStatus, CreateBulkOrderInput } from "@/types/bulkOrder";

const KEY = ["bulk-orders"];

export function useBulkOrders() {
  return useQuery({ queryKey: KEY, queryFn: () => bulkOrderService.list() });
}

function useActor() {
  const user = useSessionStore((s: { user: AdminUser | null }) => s.user);
  return user ? `${user.name} · ${user.role}` : "Admin";
}

export function useCreateBulkOrder() {
  const queryClient = useQueryClient();
  const by = useActor();
  return useMutation({
    mutationFn: (input: CreateBulkOrderInput) => bulkOrderService.create(input, by),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetBulkOrderStatus() {
  const queryClient = useQueryClient();
  const by = useActor();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: string; status: BulkOrderStatus; note?: string }) =>
      bulkOrderService.setStatus(id, status, by, note),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSetBulkPaymentStatus() {
  const queryClient = useQueryClient();
  const by = useActor();
  return useMutation({
    mutationFn: ({ id, paymentStatus }: { id: string; paymentStatus: BulkPaymentStatus }) =>
      bulkOrderService.setPaymentStatus(id, paymentStatus, by),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useAssignBulkStaff() {
  const queryClient = useQueryClient();
  const by = useActor();
  return useMutation({
    mutationFn: ({ id, role, name }: { id: string; role: "picker" | "rider"; name: string }) =>
      role === "picker" ? bulkOrderService.assignPicker(id, name, by) : bulkOrderService.assignRider(id, name, by),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
