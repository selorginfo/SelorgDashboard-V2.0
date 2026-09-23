import { mockNotificationService } from "@/services/notifications/notificationService.mock";
import { realNotificationService } from "@/services/notifications/notificationService.real";
import type { NotificationService } from "@/services/notifications/notificationService";

import { USE_MOCKS } from "@/lib/useMocks";

export const notificationService: NotificationService = USE_MOCKS ? mockNotificationService : realNotificationService;
