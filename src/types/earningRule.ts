import type { Badge } from "@/types/common";

export interface EarningRule {
  id: string;
  name: string;
  appliesTo: "Rider" | "Picker";
  component: string;
  condition: string;
  amount: string;
  scope: string;
  version: string;
  status: Badge;
  /** Set only for rules with an active conflict, shown on the detail drill-down. */
  conflictWith?: string;
}
