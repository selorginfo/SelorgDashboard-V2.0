import type { Badge, FlowStep, KpiStat, WorkspaceRow } from "@/types/common";

export const b = (label: string, tone: Badge["tone"]): Badge => ({ label, tone });

export function kpis(pairs: [string, string, string?][]): KpiStat[] {
  return pairs.map(([value, label, color]) => ({ value, label, color }));
}

export function flowPairs(pairs: [string, string][]): FlowStep[] {
  return pairs.map(([label, actor]) => ({ label, actor }));
}

export function flowLabels(labels: string[]): FlowStep[] {
  return labels.map((label) => ({ label, actor: "" }));
}

export type Row = WorkspaceRow;
