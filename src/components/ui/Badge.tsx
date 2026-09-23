import type { Tone } from "@/types/common";
import styles from "./Badge.module.css";

export function Badge({ label, tone = "grey" }: { label: string; tone?: Tone }) {
  return (
    <span className={styles.badge} data-tone={tone}>
      {label}
    </span>
  );
}
