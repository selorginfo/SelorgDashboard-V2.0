import type { NotificationPrefs } from "@/types/account";

export interface NotificationPrefsService {
  get(): Promise<NotificationPrefs>;
  update(prefs: NotificationPrefs): Promise<NotificationPrefs>;
}
