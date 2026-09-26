import type { OpsDateRange } from "@/types/adminOps";
import { OPS_RANGE_OPTIONS } from "@/services/adminOps";
import styles from "./OpsRangeFilter.module.css";

export interface OpsRangeFilterValue {
  range: OpsDateRange;
  from: string;
  to: string;
}

export function OpsRangeFilter({
  value,
  onChange,
}: {
  value: OpsRangeFilterValue;
  onChange: (next: OpsRangeFilterValue) => void;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.chips}>
        {OPS_RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            className={styles.chip}
            data-active={value.range === opt.value}
            onClick={() => onChange({ ...value, range: opt.value })}
          >
            {opt.label}
          </button>
        ))}
      </div>
      {value.range === "custom" ? (
        <div className={styles.custom}>
          <label className={styles.field}>
            <span>From</span>
            <input
              type="date"
              value={value.from}
              onChange={(e) => onChange({ ...value, from: e.target.value })}
            />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input
              type="date"
              value={value.to}
              onChange={(e) => onChange({ ...value, to: e.target.value })}
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
