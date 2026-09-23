import type { NotificationPrefs } from "@/types/account";

/** Default toggle states — matches the design's own defaults (dc.html:6788: every key defaults
 * "on" except "sms", which defaults "off"). */
export const SEED_NOTIFICATION_PREFS: NotificationPrefs = {
  sla: true,
  transfer: true,
  stock: true,
  refund: true,
  sms: false,
  weekly: true,
};
