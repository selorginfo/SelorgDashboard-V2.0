import { LayoutGrid, List } from "lucide-react";
import styles from "./ViewToggle.module.css";

export type ViewMode = "workspace" | "list";

/**
 * Card/kanban-style modules can also be read as a plain list — matches the approved design's
 * Cards/List toggle (dc.html:1671-1680), relabelled "Workspace" for the rich bespoke view.
 */
export function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (view: ViewMode) => void }) {
  return (
    <div className={styles.toggle}>
      <button
        type="button"
        className={styles.option}
        data-active={view === "workspace"}
        onClick={() => onChange("workspace")}
        title="Workspace view"
      >
        <LayoutGrid size={12} /> Workspace
      </button>
      <button
        type="button"
        className={styles.option}
        data-active={view === "list"}
        onClick={() => onChange("list")}
        title="List view"
      >
        <List size={12} /> List
      </button>
    </div>
  );
}
