import { api } from "@/lib/apiClient";
import type { NotificationEntry } from "@/types/notificationRule";
import type { WorkspaceRow } from "@/types/common";
import type { NotificationService } from "./notificationService";

export const realNotificationService: NotificationService = {
  async list(): Promise<NotificationEntry[]> {
    const res = await api.get<{ list?: NotificationEntry[] } | NotificationEntry[]>("/api/v1/admin/notifications/templates");
    if (Array.isArray(res)) return res;
    return (res as { list?: NotificationEntry[] }).list ?? [];
  },

  async deliveryLog(): Promise<WorkspaceRow[]> {
    const res = await api.get<{ list?: WorkspaceRow[] } | WorkspaceRow[]>("/api/v1/admin/notifications/history");
    if (Array.isArray(res)) return res;
    return (res as { list?: WorkspaceRow[] }).list ?? [];
  },

  async setActive(id: string, active: boolean): Promise<NotificationEntry> {
    return api.put<NotificationEntry>(`/api/v1/admin/notifications/templates/${id}`, { active });
  },

  async sendTest(id: string): Promise<void> {
    await api.post(`/api/v1/admin/notifications/history/${id}/retry`);
  },
};
