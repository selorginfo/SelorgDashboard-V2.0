import styles from "./Skeleton.module.css";

export function Skeleton({ width, height = "14px" }: { width?: string; height?: string }) {
  return <span className={styles.skeleton} style={{ width, height }} />;
}

export function TableSkeleton({ rows = 6, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className={styles.table}>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className={styles.row}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} width={c === 0 ? "70%" : "100%"} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className={styles.card}>
      <Skeleton width="40%" height="11px" />
      <Skeleton width="60%" height="24px" />
    </div>
  );
}
