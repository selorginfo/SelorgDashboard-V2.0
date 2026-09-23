import { mockNotificationPrefsService } from "@/services/account/notificationPrefsService.mock";
import { realNotificationPrefsService } from "@/services/account/notificationPrefsService.real";
import type { NotificationPrefsService } from "@/services/account/notificationPrefsService";

import { USE_MOCKS } from "@/lib/useMocks";

export const notificationPrefsService: NotificationPrefsService = USE_MOCKS ? mockNotificationPrefsService : realNotificationPrefsService;
