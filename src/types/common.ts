export type Tone = "green" | "amber" | "blue" | "red" | "grey";

export interface Badge {
  label: string;
  tone: Tone;
}

export interface KpiStat {
  label: string;
  value: string;
  color?: string;
}

export interface FlowStep {
  label: string;
  actor: string;
}

export interface ChartSeriesPoint {
  label: string;
  v1: number;
  v2: number;
}

export interface DonutSlice {
  label: string;
  value: number;
  color: string;
}

/** Bar chart + donut/stacked-bar pair, transcribed from the approved design's `CHARTS` map
 * (dc.html:4607-4642) — renders between the KPI strip and the flow strip on the routes that have
 * one (the 5 report detail screens). */
export interface WorkspaceChart {
  title: string;
  sub: string;
  legend: [string, string];
  /** Suffix appended to bar-hover values, e.g. "L" for lakh, "%", or "" for a plain count. */
  unit: string;
  series: ChartSeriesPoint[];
  donutTitle: string;
  donut: DonutSlice[];
}

/** Generic per-route config that drives the shared Workspace template (KPI strip + tabs + table). */
export interface WorkspaceConfig {
  hint: string;
  flow: FlowStep[];
  flowAt?: number;
  kpis: KpiStat[];
  tabs: string[];
  columns: string[];
  rows: Record<string, WorkspaceRow[]>;
  chart?: WorkspaceChart;
}

export type WorkspaceCell = string | Badge | null | undefined;
export type WorkspaceRow = WorkspaceCell[];

export interface AsyncState {
  isLoading: boolean;
  isError: boolean;
  error?: string;
}
