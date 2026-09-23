import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import type { NotificationEntry } from "@/types/notificationRule";
import type { Badge } from "@/types/common";

const TAB_TO_KIND: Record<string, NotificationEntry["kind"]> = {
  Templates: "template",
  Rules: "rule",
  Channels: "channel",
};

/** Reuses the "Templates"/"Rules"/"Channels" rows already transcribed in workspace/data/system.ts
 * (the design's own Notifications screen), reshaped for the bespoke card view. */
function buildSeed(): NotificationEntry[] {
  const config = SYSTEM_CONFIGS.notifications;
  if (!config) return [];
  const items: NotificationEntry[] = [];
  let counter = 0;
  for (const [tab, kind] of Object.entries(TAB_TO_KIND)) {
    const rows = config.rows[tab] ?? [];
    for (const row of rows) {
      const [name, trigger, audience, channel, timing, sent24h, delivery, status] = row;
      items.push({
        id: `notif-${counter++}`,
        kind,
        name: name as string,
        trigger: trigger as string,
        audience: audience as string,
        channel: channel as string,
        timing: timing as string,
        sent24h: sent24h as string,
        delivery: delivery as string,
        status: status as Badge,
      });
    }
  }
  return items;
}

export const SEED_NOTIFICATIONS: NotificationEntry[] = buildSeed();

export const SEED_DELIVERY_LOG = SYSTEM_CONFIGS.notifications?.rows["Delivery log"] ?? [];
