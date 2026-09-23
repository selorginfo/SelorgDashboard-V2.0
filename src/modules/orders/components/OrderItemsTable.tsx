import type { Order } from "@/types/order";
import { Card } from "@/components/ui/Card";
import styles from "./OrderItemsTable.module.css";

export function OrderItemsTable({ order }: { order: Order }) {
  return (
    <Card className={styles.card}>
      <div className={styles.title}>Items &amp; scan verification</div>
      <div className={styles.scroll}>
        <table className={styles.table}>
          <colgroup>
            <col /><col /><col /><col /><col /><col />
          </colgroup>
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Qty</th>
              <th>Picked</th>
              <th>Missing</th>
              <th style={{ textAlign: "right" }}>Price</th>
            </tr>
          </thead>
          <tbody>
            {(order.items ?? []).map((it, idx) => (
              <tr key={it.sku || idx}>
                <td className={styles.name} title={it.name}>{it.name}</td>
                <td className={styles.mono} title={it.sku}>
                  {it.sku ? `…${it.sku.slice(-8)}` : "—"}
                </td>
                <td className={styles.mono}>{it.qty}</td>
                <td className={styles.mono}>{it.picked}</td>
                <td className={styles.mono} data-missing={it.missing > 0}>
                  {it.missing}
                </td>
                <td className={styles.price}>{it.price}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {(order.scans ?? []).length > 0 ? (
        <>
          <div className={styles.subTitle}>Scan events</div>
          <div className={styles.scanList}>
            {(order.scans ?? []).map((s, i) => (
              <div key={i} className={styles.scanRow}>
                <span className={styles.scanTime}>{s.time}</span>
                <span className={styles.scanType}>{s.type}</span>
                <span className={styles.scanRef}>{s.ref}</span>
                <span className={styles.scanDevice}>{s.device}</span>
                <span className={styles.scanResult} data-warn={s.result !== "OK" && s.result !== "Verified"}>
                  {s.result}
                </span>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}
