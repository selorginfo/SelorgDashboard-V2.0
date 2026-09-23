import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_NOTIFICATIONS, SEED_DELIVERY_LOG } from "@/services/notifications/seed";
import type { NotificationEntry } from "@/types/notificationRule";
import type { NotificationService } from "@/services/notifications/notificationService";

const table = createMockTable<NotificationEntry>("selorg.notifications", SEED_NOTIFICATIONS);

export const mockNotificationService: NotificationService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async deliveryLog() {
    await mockDelay(200);
    return SEED_DELIVERY_LOG;
  },

  async setActive(id, active) {
    await mockDelay(220);
    let updated: NotificationEntry | undefined;
    table.update((rows) =>
      rows.map((n) => {
        if (n.id !== id) return n;
        updated = { ...n, status: active ? { label: "Active", tone: "green" } : { label: "Paused", tone: "grey" } };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Notification ${id} not found`);
    return updated;
  },

  async sendTest() {
    await mockDelay(320);
  },
};
