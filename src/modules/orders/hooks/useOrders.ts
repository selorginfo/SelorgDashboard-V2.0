import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { orderService } from "@/services/orders";
import type { OrderActionId } from "@/types/order";
import type { PlaceOrderInput } from "@/services/orders/orderService";

const LOG_KEY = (id: string) => ["orders", id, "log"];

export function useOrders(date?: string) {
  return useQuery({
    queryKey: ["orders", date ?? "today"],
    queryFn: () => orderService.list(date),
    refetchInterval: 15_000,
  });
}

export function useOrderLog(orderId: string | undefined) {
  return useQuery({
    queryKey: orderId ? LOG_KEY(orderId) : ["orders", "log", "none"],
    queryFn: () => orderService.getLog(orderId as string),
    enabled: Boolean(orderId),
  });
}

export function useAdvanceStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, rawStatus }: { orderId: string; rawStatus?: string }) =>
      orderService.advanceStage(orderId, rawStatus),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: LOG_KEY(order.id) });
    },
  });
}

export function useOrderAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      orderId,
      action,
      values,
    }: {
      orderId: string;
      action: OrderActionId;
      values: Record<string, string>;
    }) => orderService.applyAction(orderId, action, values),
    onSuccess: (order) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: LOG_KEY(order.id) });
    },
  });
}

export function usePlaceOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => orderService.placeOnBehalf(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["orders"] }),
  });
}
