import type { Tone, WorkspaceCell } from "@/types/common";

/** Badge tone for a status cell. A few design rows carry plain-text statuses; infer those. */
export function toneOf(cell: WorkspaceCell): Tone {
  if (cell && typeof cell === "object") return cell.tone;
  const t = String(cell ?? "");
  if (/late|fail|breach|expir|block|puncture/i.test(t)) return "red";
  if (/paus|at a stop|unloading|dispatched/i.test(t)) return "amber";
  if (/closed|delivered|complete/i.test(t)) return "green";
  return "blue";
}
