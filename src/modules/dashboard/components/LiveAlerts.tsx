import { useNavigate } from "react-router-dom";
import type { DashboardAlert } from "@/modules/dashboard/types";
import { Card } from "@/components/ui/Card";
import styles from "./LiveAlerts.module.css";

export function LiveAlerts({ alerts }: { alerts: DashboardAlert[] }) {
  const navigate = useNavigate();

  return (
    <Card className={styles.card}>
      <div className={styles.title}>Live alerts</div>
      {alerts.length > 0 ? (
        <>
          <div className={styles.sub}>Needs action now</div>
          <div className={styles.list}>
            {alerts.map((a) => (
              <button key={a.id} type="button" className={styles.row} onClick={() => navigate(a.linkTo)}>
                <span className={styles.dot} style={{ background: a.color }} />
                <span className={styles.body}>
                  <span className={styles.rowTitle}>{a.title}</span>
                  <span className={styles.detail}>{a.detail}</span>
                </span>
                <span className={styles.ago}>{a.ago}</span>
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className={styles.sub}>No active alerts</div>
      )}
    </Card>
  );
}
