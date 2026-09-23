import { Link } from "react-router-dom";
import type { SupplyStat, DeliveryStat } from "@/modules/dashboard/types";
import { Card } from "@/components/ui/Card";
import styles from "./SupplyDeliveryPanels.module.css";

export function SupplyDeliveryPanels({
  supply,
  delivery,
}: {
  supply: SupplyStat[];
  delivery: DeliveryStat[];
}) {
  return (
    <div className={styles.stack}>
      <Card className={styles.card}>
        <div className={styles.title}>Supply chain</div>
        <div className={styles.supplyGrid}>
          {supply.map((s) => (
            <div key={s.label} className={styles.supplyCell}>
              <div className={styles.supplyValue} style={{ color: s.color }}>
                {s.value}
              </div>
              <div className={styles.supplyLabel}>{s.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className={styles.card}>
        <div className={styles.headerRow}>
          <div className={styles.title}>Delivery</div>
          <Link to="/riders" className={styles.link}>
            Live map →
          </Link>
        </div>
        <div className={styles.deliveryList}>
          {delivery.map((d) => (
            <div key={d.label} className={styles.deliveryRow}>
              <div className={styles.deliveryLabel}>{d.label}</div>
              <div className={styles.track}>
                <div className={styles.fill} style={{ width: `${d.pct}%`, background: d.color }} />
              </div>
              <div className={styles.deliveryValue}>{d.value}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
