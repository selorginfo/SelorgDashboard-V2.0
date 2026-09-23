import type { Badge } from "@/types/common";

export interface ScheduledContent {
  id: string;
  title: string;
  type: string;
  surface: string;
  placement: string;
  date: string;
  time: string;
  owner: string;
  status: Badge;
  /** True when this item also appears in the design's "Conflicts" tab (a slot clash flagged
   * separately from its lifecycle status). */
  hasConflict: boolean;
}
