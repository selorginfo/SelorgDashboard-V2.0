import type { ModuleId } from "@/constants/nav";
import type { WorkspaceCell } from "@/types/common";
import { GENERATED_SCREENS } from "@/modules/ops/data/screens.generated";
import { GENERATED_ACTION_FORMS } from "@/modules/ops/data/actionForms.generated";
import { BULK_SCREENS } from "@/modules/ops/data/bulkScreens";
import type { OpsActionForm, OpsScreenDef } from "@/modules/ops/types";

export const OPS_SCREENS: Record<string, OpsScreenDef> = { ...GENERATED_SCREENS, ...BULK_SCREENS };

/** Every route rendered by the ops engine (OpsModulePage). */
export const OPS_ROUTE_IDS = Object.keys(OPS_SCREENS) as ModuleId[];

export function opsScreen(route: string): OpsScreenDef | undefined {
  return OPS_SCREENS[route];
}

export function actionForm(label: string): OpsActionForm | undefined {
  return GENERATED_ACTION_FORMS[label];
}

/** Actions that must carry a reason when they have no form (design: NEEDS_NOTE). */
const NEEDS_NOTE = /^(Reject|Cancel|Raise|Escalate|Block|Deactivate|Revert|Disable|Pause|End campaign|Flag)/;
export function actionNeedsNote(label: string): boolean {
  return NEEDS_NOTE.test(label);
}

/** Destructive actions are styled as danger buttons. */
export function isDangerAction(label: string): boolean {
  return /^(Cancel|Retire|Deactivate|Suspend|Hold|End campaign|Expire|Flag|Skip|Remove|Escalate|Exclude)/.test(label);
}

export function cellText(cell: WorkspaceCell): string {
  if (cell == null) return "—";
  return typeof cell === "string" ? cell : cell.label;
}

/** The value a record is identified by — its first column. */
export function recordId(row: WorkspaceCell[]): string {
  return cellText(row[0]);
}

/**
 * Flow stage a record starts at when nothing has been recorded against it. The design opens every
 * record at the screen's flowAt; here the record's own status wins when it names a stage
 * ("Awaiting vehicle" sits just before "Vehicle assigned", "Completed" on "Completed"), so the
 * stepper never contradicts the badge. flowAt remains the fallback.
 */
export function defaultStage(screen: OpsScreenDef, row?: WorkspaceCell[]): number {
  if (!screen.flow.length) return 0;
  const fallback = screen.flowAt ?? Math.max(1, Math.round(screen.flow.length * 0.55));
  if (!row) return fallback;
  const status = cellText(row[screen.columns.length - 1]).toLowerCase();
  const labels = screen.flow.map((f) => f.label.toLowerCase());
  const exact = labels.findIndex((l) => status.includes(l) || l.includes(status));
  if (exact >= 0) return exact;
  const awaiting = status.match(/^awaiting (\w+)/);
  if (awaiting) {
    const i = labels.findIndex((l) => l.includes(awaiting[1]!));
    if (i > 0) return i - 1;
  }
  const byWord = labels.findIndex((l) => l.split(/\s+/).some((w) => w.length > 4 && status.includes(w)));
  return byWord >= 0 ? byWord : fallback;
}
