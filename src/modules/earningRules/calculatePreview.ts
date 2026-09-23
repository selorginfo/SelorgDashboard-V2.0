import type { EarningRule } from "@/types/earningRule";

export interface RulePreview {
  isPerUnit: boolean;
  unit?: string;
  rate?: number;
  flatAmount?: string;
  compute: (units: number) => number;
}

const PER_UNIT_RE = /^₹([\d.]+) per (\w+)$/;

/** Parses the rule's own configured amount string — no separate formula engine, since the
 * design's rule data only ever expresses two shapes: a flat amount or a "₹X per unit" rate. */
export function parseRuleAmount(rule: EarningRule): RulePreview {
  const match = PER_UNIT_RE.exec(rule.amount);
  if (match) {
    const rate = Number(match[1]);
    const unit = match[2];
    return { isPerUnit: true, unit, rate, compute: (units) => Math.round(units * rate * 100) / 100 };
  }
  const flat = Number(rule.amount.replace(/[₹,]/g, ""));
  return {
    isPerUnit: false,
    flatAmount: rule.amount,
    compute: () => (Number.isFinite(flat) ? flat : 0),
  };
}
