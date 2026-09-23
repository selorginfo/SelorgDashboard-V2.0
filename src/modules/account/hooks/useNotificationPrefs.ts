import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationPrefsService } from "@/services/account";
import type { NotificationPrefs } from "@/types/account";

const KEY = ["account-notification-prefs"];

export function useNotificationPrefs() {
  return useQuery({ queryKey: KEY, queryFn: () => notificationPrefsService.get() });
}

export function useUpdateNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (prefs: NotificationPrefs) => notificationPrefsService.update(prefs),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
