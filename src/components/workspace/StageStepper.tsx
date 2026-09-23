import styles from "./StageStepper.module.css";

/**
 * Numbered lifecycle stepper — the same dot/line treatment as the order detail stepper
 * (modules/orders/components/OrderStageStepper), generalised for any list of stages so Bulk
 * Orders and the Delivery / Container Stalls records can show their own lifecycles. `current` is the index of the stage the
 * record is at; `halted` greys the remaining steps (e.g. a cancelled order).
 */
export function StageStepper({
  stages,
  current,
  halted,
}: {
  stages: readonly string[];
  current: number;
  halted?: boolean;
}) {
  const safe = Math.max(0, Math.min(current, stages.length - 1));
  const complete = safe >= stages.length - 1;
  return (
    <div className={styles.stepRow}>
      {stages.map((name, i) => {
        const done = i < safe || (complete && i === safe);
        const isCurrent = i === safe && !complete;
        return (
          <div key={name} className={styles.step}>
            <div className={styles.line}>
              <span className={styles.lineSeg} data-filled={i > 0 && i <= safe} />
              <span className={styles.dot} data-done={done} data-current={isCurrent} data-halted={halted && isCurrent}>
                {i + 1}
              </span>
              <span className={styles.lineSeg} data-filled={i < safe} />
            </div>
            <div className={styles.stepName} data-current={i === safe}>
              {name}
            </div>
          </div>
        );
      })}
    </div>
  );
}
