import { PURPOSE } from "@/constants/purpose";
import type { ModuleId } from "@/constants/nav";
import type { FlowStep } from "@/types/common";
import styles from "./PurposeBanner.module.css";

/**
 * "Who uses this screen, what they decide here" banner shown at the top of nearly every screen
 * in the approved design (`hasPurpose` block, dc.html:1629-1650), with a compact numbered flow
 * stepper embedded when the module also has a lifecycle flow — distinct from the standalone
 * chip-style FlowStrip card shown further down the page (the design renders both).
 */
export function PurposeBanner({
  moduleId,
  flow,
  activeIndex,
  purpose: override,
}: {
  moduleId: ModuleId;
  flow?: FlowStep[];
  activeIndex?: number;
  /** Supplied directly by screens whose purpose comes with their own definition (ops engine). */
  purpose?: [string, string, string] | null;
}) {
  const purpose = override ?? PURPOSE[moduleId];
  if (!purpose) return null;
  const [who, what] = purpose;

  return (
    <div className={styles.banner}>
      <div className={styles.headline}>
        <span className={styles.who}>{who}</span>
        <span className={styles.what}>{what}</span>
      </div>
      {flow && flow.length > 0 ? (
        <div className={styles.stepRow}>
          {flow.map((step, i) => (
            <div key={step.label} className={styles.stepItem}>
              <span className={styles.stepBadge} data-done={activeIndex !== undefined && i < activeIndex}>
                {i + 1}
              </span>
              {activeIndex === i ? <span className={styles.hereTag}>You are here</span> : null}
              <span className={styles.stepLabel}>{step.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
