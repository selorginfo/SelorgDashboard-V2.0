import { ORDER_STAGES } from "@/types/order";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useUiStore } from "@/store/uiStore";
import styles from "./OrderStageStepper.module.css";

export function OrderStageStepper({
  orderId,
  customer,
  store,
  date,
  stage,
  onAdvance,
  isAdvancing,
}: {
  orderId: string;
  customer: string;
  store: string;
  date: string;
  stage: number;
  onAdvance: () => void;
  isAdvancing?: boolean;
}) {
  const safeStage = Number.isFinite(stage) ? Math.max(0, Math.min(stage, ORDER_STAGES.length - 1)) : 0;
  const isComplete = safeStage >= ORDER_STAGES.length - 1;
  const pushToast = useUiStore((s) => s.pushToast);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>{orderId}</div>
          <div className={styles.sub}>
            {customer} · {store} · {date}
          </div>
        </div>
        <div className={styles.actions}>
          <span className={styles.stageBadge}>{ORDER_STAGES[safeStage]}</span>
          <Button variant="primary" size="sm" onClick={onAdvance} isLoading={isAdvancing} disabled={isComplete}>
            {isComplete ? "Order complete" : `Mark ${ORDER_STAGES[safeStage + 1]}`}
          </Button>
          <Button size="sm" onClick={() => pushToast(`Opening full record for ${orderId}`, "info")}>
            Full record
          </Button>
        </div>
      </div>
      <div className={styles.stepRow}>
        {ORDER_STAGES.map((name, i) => {
          const done = i < safeStage;
          const current = i === safeStage;
          return (
            <div key={name} className={styles.step}>
              <div className={styles.line}>
                <span className={styles.lineSeg} data-filled={i > 0 && i <= safeStage} />
                <span className={styles.dot} data-done={done} data-current={current}>
                  {i + 1}
                </span>
                <span className={styles.lineSeg} data-filled={i < safeStage} />
              </div>
              <div className={styles.stepName} data-current={current}>
                {name}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
