import type { HourlyBar } from "@/modules/dashboard/types";
import { Card } from "@/components/ui/Card";
import styles from "./OrderFlowChart.module.css";

export function OrderFlowChart({ hourly }: { hourly: HourlyBar[] }) {
  const hasData = hourly.some((h) => h.heightPct > 0);

  return (
    <Card className={styles.card}>
      <div className={styles.header}>
        <div>
          <div className={styles.title}>Order flow — today</div>
          <div className={styles.sub}>Orders per hour, all dark stores</div>
        </div>
        {hasData && (
          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} data-tone="brand" />
              Delivered
            </span>
            <span className={styles.legendItem}>
              <span className={styles.legendDot} data-tone="pending" />
              In progress
            </span>
          </div>
        )}
      </div>
      {hasData ? (
        <div className={styles.chart}>
          {hourly.map((h) => (
            <div key={h.hour} className={styles.col}>
              <div className={styles.bar} style={{ height: `${h.heightPct}%` }}>
                <div className={styles.pending} style={{ height: `${h.pendingPct}%` }} />
                <div className={styles.delivered} />
              </div>
              <div className={styles.hourLabel}>{h.hour}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.chart} style={{ alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "var(--mu)", fontSize: 13, fontWeight: 600 }}>No hourly data yet</span>
        </div>
      )}
    </Card>
  );
}
