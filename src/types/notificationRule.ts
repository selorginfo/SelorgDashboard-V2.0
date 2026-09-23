import type { Badge } from "@/types/common";

export interface NotificationEntry {
  id: string;
  kind: "template" | "rule" | "channel";
  name: string;
  trigger: string;
  audience: string;
  channel: string;
  timing: string;
  sent24h: string;
  delivery: string;
  status: Badge;
}
