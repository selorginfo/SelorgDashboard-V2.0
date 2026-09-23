import { api } from "@/lib/apiClient";
import type { NotificationPrefs } from "@/types/account";
import type { NotificationPrefsService } from "./notificationPrefsService";

export const realNotificationPrefsService: NotificationPrefsService = {
  async get(): Promise<NotificationPrefs> {
    // Stored in platform-config under user-specific key
    return api.get<NotificationPrefs>("/api/v1/admin/app-settings").catch(() => ({} as NotificationPrefs));
  },

  async update(prefs: NotificationPrefs): Promise<NotificationPrefs> {
    return api.put<NotificationPrefs>("/api/v1/admin/app-settings", prefs);
  },
};
