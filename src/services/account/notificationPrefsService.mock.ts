import { createMockTable, mockDelay } from "@/services/mockDb";
import { SEED_NOTIFICATION_PREFS } from "@/services/account/notificationPrefsSeed";
import type { NotificationPrefs } from "@/types/account";
import type { NotificationPrefsService } from "@/services/account/notificationPrefsService";

/** createMockTable is shaped for lists, so the single preferences object is stored as the
 * table's only row — same localStorage-backed persistence every other module uses. */
const table = createMockTable<NotificationPrefs>("selorg.account.notificationPrefs", [SEED_NOTIFICATION_PREFS]);

export const mockNotificationPrefsService: NotificationPrefsService = {
  async get() {
    await mockDelay();
    return table.all()[0] ?? SEED_NOTIFICATION_PREFS;
  },

  async update(prefs) {
    await mockDelay(200);
    table.set([prefs]);
    return prefs;
  },
};
