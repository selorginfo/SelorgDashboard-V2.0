import type { NotificationEntry } from "@/types/notificationRule";
import type { WorkspaceRow } from "@/types/common";

export interface NotificationService {
  list(): Promise<NotificationEntry[]>;
  deliveryLog(): Promise<WorkspaceRow[]>;
  setActive(id: string, active: boolean): Promise<NotificationEntry>;
  sendTest(id: string): Promise<void>;
}
