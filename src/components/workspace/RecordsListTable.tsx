import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import type { WorkspaceRow, WorkspaceCell } from "@/types/common";
import styles from "./RecordsListTable.module.css";

function renderCell(cell: WorkspaceCell) {
  if (cell == null) return "—";
  return typeof cell === "string" ? cell : <Badge label={cell.label} tone={cell.tone} />;
}

/** The plain flat-table fallback for the "List" side of a module's Workspace/List toggle —
 * same columns and rows the card/kanban view already has, just laid out as a table. */
export function RecordsListTable({
  columns,
  rows,
  onRowClick,
}: {
  columns: string[];
  rows: WorkspaceRow[];
  onRowClick?: (index: number) => void;
}) {
  return (
    <Card className={styles.tableCard}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={onRowClick ? styles.clickableRow : undefined} onClick={() => onRowClick?.(i)}>
                {row.map((cell, j) => (
                  <td key={j} className={j === 0 ? styles.mono : undefined}>
                    {renderCell(cell)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
