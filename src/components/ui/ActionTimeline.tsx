import type { WDTransferLog } from "@/types/warehouse";
import styles from "./ActionTimeline.module.css";

const ACTION_ICON: Record<string, string> = {
  created: "🛒",
  accepted: "✅",
  rejected: "❌",
  packed: "📦",
  dispatched: "🚚",
  received: "🏬",
  completed: "✔️",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ActionTimeline({ logs, isLoading }: { logs: WDTransferLog[]; isLoading?: boolean }) {
  if (isLoading) return <div className={styles.loading}>Loading activity log…</div>;
  if (!logs.length) return <div className={styles.empty}>No activity yet</div>;

  return (
    <div className={styles.timeline}>
      {logs.map((log, idx) => (
        <div key={log._id ?? idx} className={styles.entry}>
          <div className={styles.iconCol}>
            <span className={styles.icon}>{ACTION_ICON[log.action] ?? "·"}</span>
            {idx < logs.length - 1 && <div className={styles.line} />}
          </div>
          <div className={styles.content}>
            <div className={styles.header}>
              <span className={styles.action}>{log.action.charAt(0).toUpperCase() + log.action.slice(1)}</span>
              <span className={styles.by}>by {log.performed_by}</span>
              <span className={styles.time}>{fmt(log.createdAt)}</span>
            </div>
            {log.note && <div className={styles.note}>{log.note}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
