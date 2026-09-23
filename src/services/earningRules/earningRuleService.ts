import type { EarningRule } from "@/types/earningRule";

export type EarningRuleAction =
  | "Submit for approval"
  | "Approve rule"
  | "Schedule rule"
  | "Resolve conflict"
  | "Expire rule";

export interface EarningRuleService {
  list(): Promise<EarningRule[]>;
  applyAction(id: string, action: EarningRuleAction): Promise<EarningRule>;
}
