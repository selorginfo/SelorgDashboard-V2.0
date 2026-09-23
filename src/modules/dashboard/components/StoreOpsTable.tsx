import { useNavigate } from "react-router-dom";
import type { StoreOpsRow } from "@/modules/dashboard/types";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import styles from "./StoreOpsTable.module.css";

export function StoreOpsTable({ rows }: { rows: StoreOpsRow[] }) {
  const navigate = useNavigate();

  return (
    <Card className={styles.card}>
      <div className={styles.title}>Dark store operations</div>
      {rows.length > 0 ? (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Store</th>
                <th>Orders</th>
                <th>Pick</th>
                <th>Pack</th>
                <th>SLA</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} onClick={() => navigate("/stores")} className={styles.row}>
                  <td>
                    <div className={styles.storeName}>{r.name}</div>
                    <div className={styles.storeCity}>{r.city}</div>
                  </td>
                  <td className={styles.mono}>{r.orders}</td>
                  <td className={styles.muted}>{r.pick}</td>
                  <td className={styles.muted}>{r.pack}</td>
                  <td className={styles.mono} style={{ color: r.slaColor, fontWeight: 700 }}>
                    {r.sla}
                  </td>
                  <td>
                    <Badge label={r.status} tone={r.badgeTone} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div style={{ padding: "24px 18px", color: "var(--mu)", fontSize: 13, fontWeight: 600 }}>
          No store data available
        </div>
      )}
    </Card>
  );
}
