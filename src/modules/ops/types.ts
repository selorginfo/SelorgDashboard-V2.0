import type { FlowStep, KpiStat, Tone, WorkspaceRow } from "@/types/common";
import type { ModuleId } from "@/constants/nav";

/**
 * The approved design renders every Delivery and Container Stalls screen from one data-driven
 * engine: a screen definition (tabs → rows, flow, KPIs), a list layout, a record-detail pattern,
 * per-record actions with their own forms, bulk actions and related-record links. These types
 * mirror that model; the data itself is generated from the design (data/*.generated.ts).
 */

/** How the list renders. "table" is always available through the List toggle. */
export type OpsLayout =
  | "table"
  | "network"
  | "sites"
  | "directory"
  | "runsheet"
  | "routeplan"
  | "funnel"
  | "triage"
  | "campaign"
  | "dispatch"
  | "consignment"
  | "loadplan"
  | "rules"
  | "payrun";

/** How one record's detail page is laid out. */
export type OpsDetail = "generic" | "lifecycle" | "trace" | "profile" | "investigate" | "rule" | "payslip";

export interface OpsLink {
  label: string;
  /** Column whose value names the linked record … */
  col?: number;
  suffix?: string;
  /** … or fixed text when the link is to a list rather than one record. */
  text?: string;
  route: ModuleId | string;
}

export interface OpsBulkAction {
  label: string;
  danger?: boolean;
  /** Regex source: offered only when every selected record's status matches. */
  only?: string;
}

export interface OpsScreenDef {
  id: string;
  group: string;
  title: string;
  hint: string;
  flow: FlowStep[];
  flowAt?: number;
  kpis: KpiStat[];
  tabs: string[];
  columns: string[];
  rows: Record<string, WorkspaceRow[]>;
  layout: OpsLayout;
  detail: OpsDetail;
  /** [who uses it, what they decide here, what happens after] */
  purpose: [string, string, string] | null;
  actions: string[];
  bulk: OpsBulkAction[];
  /** Singular record name, e.g. "Batch". */
  entity: string;
  /** Record capabilities from the design: c = create, u = update, d = delete. */
  cap: string;
  links: OpsLink[];
}

export interface OpsActionField {
  id: string;
  label: string;
  kind: "text" | "select" | "textarea";
  options: string[];
  required: boolean;
}

export interface OpsActionForm {
  /** Completing the action moves the record to the next flow stage. */
  advances: boolean;
  effect?: string;
  fields: OpsActionField[];
}

/** What an action does to the record it is applied to (beyond the activity log). */
export interface OpsActionEffect {
  /** New status badge — fixed, or derived from the submitted form. */
  status?: [string, Tone] | ((values: Record<string, string>) => [string, Tone]);
  /** Column index → new value, derived from the form and the current row. */
  set?: Record<number, (values: Record<string, string>, row: WorkspaceRow) => string>;
  /** Removes the record from every tab (e.g. excluded from the bulk queue). */
  remove?: boolean;
}

export interface OpsLogEntry {
  id: string;
  action: string;
  by: string;
  /** ISO timestamp */
  at: string;
  note?: string;
}

/** Persisted state for one route: rows per tab, plus per-record flow stage and activity. */
export interface OpsRouteState {
  rows: Record<string, WorkspaceRow[]>;
  stage: Record<string, number>;
  log: Record<string, OpsLogEntry[]>;
}
