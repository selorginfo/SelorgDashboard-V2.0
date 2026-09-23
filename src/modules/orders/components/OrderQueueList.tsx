import type { Order } from "@/types/order";
import { Badge } from "@/components/ui/Badge";
import styles from "./OrderQueueList.module.css";

export function OrderQueueList({
  orders,
  selectedId,
  onSelect,
}: {
  orders: Order[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
}) {
  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <span>Order queue</span>
        <span className={styles.count}>{orders.length}</span>
      </div>
      <div className={styles.rows}>
        {orders.map((o) => {
          const selected = o.id === selectedId;
          return (
            <button
              key={o.id}
              type="button"
              className={styles.row}
              data-selected={selected}
              data-rail={o.tone}
              onClick={() => onSelect(o.id)}
            >
              <div className={styles.top}>
                <span className={styles.id}>{o.id}</span>
                <span className={styles.value}>{o.value}</span>
              </div>
              <div className={styles.customer}>{o.customer}</div>
              <div className={styles.store}>{o.store}</div>
              <div className={styles.badges}>
                <Badge label={o.status} tone={o.tone} />
                <span className={styles.sla} data-sla={o.sla}>
                  {o.sla}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
