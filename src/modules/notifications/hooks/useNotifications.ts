import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "@/services/notifications";

const KEY = ["notifications"];

export function useNotificationEntries() {
  return useQuery({ queryKey: KEY, queryFn: () => notificationService.list() });
}

export function useDeliveryLog() {
  return useQuery({ queryKey: ["notifications-log"], queryFn: () => notificationService.deliveryLog() });
}

export function useSetNotificationActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => notificationService.setActive(id, active),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useSendTest() {
  return useMutation({ mutationFn: (id: string) => notificationService.sendTest(id) });
}
