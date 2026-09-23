import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import type { Tone } from "@/types/common";
import styles from "./SectionsBoard.module.css";

export function SectionsBoard({
  sections,
  active,
  onSelect,
  hint,
  children,
}: {
  sections: string[];
  active: string;
  onSelect: (section: string) => void;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={styles.board}>
      <Card className={styles.sidebar}>
        <div className={styles.sidebarTitle}>Sections</div>
        <div className={styles.sidebarList}>
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              className={styles.sidebarItem}
              data-active={section === active}
              onClick={() => onSelect(section)}
            >
              {section}
            </button>
          ))}
        </div>
      </Card>

      <div className={styles.content}>
        {hint ? <p className={styles.hint}>{hint}</p> : null}
        {children}
      </div>
    </div>
  );
}

export function ConfigRow({
  name,
  scope,
  detail,
  value,
  updatedLabel,
  status,
  statusTone,
  onConfigure,
}: {
  name: string;
  scope: string;
  detail: string;
  value: string;
  updatedLabel: string;
  status: string;
  statusTone: Tone;
  onConfigure?: () => void;
}) {
  return (
    <Card className={styles.row}>
      <div className={styles.rowIdentity}>
        <div className={styles.rowName}>{name}</div>
        <div className={styles.rowScope}>{scope}</div>
        <div className={styles.rowDetail}>{detail}</div>
      </div>
      <div className={styles.rowValueCol}>
        <div className={styles.rowValue}>{value}</div>
        <div className={styles.rowUpdated}>{updatedLabel}</div>
      </div>
      <div className={styles.rowActions}>
        <span className={styles.rowStatus} data-tone={statusTone}>
          {status}
        </span>
        {onConfigure ? (
          <button type="button" className={styles.configureBtn} onClick={onConfigure}>
            Configure
          </button>
        ) : null}
      </div>
    </Card>
  );
}
