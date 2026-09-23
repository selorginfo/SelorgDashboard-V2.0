import type { FlowStep } from "@/types/common";
import styles from "./FlowStrip.module.css";

export function FlowStrip({ flow, activeIndex }: { flow: FlowStep[]; activeIndex?: number }) {
  return (
    <div className={styles.strip}>
      {flow.map((step, i) => {
        const done = activeIndex !== undefined && i < activeIndex;
        const current = i === activeIndex;
        return (
          <div key={step.label} className={styles.step}>
            <div className={styles.line} data-filled={i > 0 && (done || current)} />
            <div className={styles.dot} data-done={done} data-current={current}>
              {done ? "✓" : i + 1}
            </div>
            <div className={styles.label}>
              <div className={styles.stepName} data-current={current}>
                {step.label}
              </div>
              {step.actor ? <div className={styles.actor}>{step.actor}</div> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
