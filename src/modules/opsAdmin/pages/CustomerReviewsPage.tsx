import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { useCustomerReviews } from "@/modules/opsAdmin/hooks/useAdminOps";
import type { KpiStat } from "@/types/common";
import styles from "./OpsAdmin.module.css";

export function CustomerReviewsPage() {
  const navigate = useNavigate();
  const [rating, setRating] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const { data, isLoading, isError, refetch } = useCustomerReviews({
    rating: rating || undefined,
    from: from || undefined,
    to: to || undefined,
  });

  const rows = data ?? [];

  const kpis: KpiStat[] = useMemo(() => {
    if (rows.length === 0) {
      return [
        { value: "0", label: "Reviews" },
        { value: "—", label: "Avg rating" },
        { value: "0", label: "5 star" },
        { value: "0", label: "1–2 star" },
      ];
    }
    const avg = rows.reduce((s, r) => s + r.rating, 0) / rows.length;
    return [
      { value: String(rows.length), label: "Reviews" },
      { value: avg.toFixed(1), label: "Avg rating" },
      { value: String(rows.filter((r) => r.rating >= 5).length), label: "5 star" },
      { value: String(rows.filter((r) => r.rating > 0 && r.rating <= 2).length), label: "1–2 star" },
    ];
  }, [rows]);

  if (isLoading) return <CardSkeleton />;
  if (isError) {
    return <ErrorState message="Couldn't load customer reviews." onRetry={() => void refetch()} />;
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="customer-reviews" />

      <Card className={styles.filterCard}>
        <div className={styles.filtersRow}>
          <label className={styles.field}>
            <span>Rating</span>
            <select value={rating} onChange={(e) => setRating(e.target.value)}>
              <option value="">All</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={String(n)}>
                  {n} star
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className={styles.field}>
            <span>To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
      </Card>

      <KpiStrip kpis={kpis} moduleId="customer-reviews" />

      {rows.length === 0 ? (
        <EmptyState title="No reviews found" />
      ) : (
        <div className={styles.sectionGrid}>
          {rows.map((row) => (
            <Card
              key={row.id}
              className={styles.progressCard}
              onClick={() => navigate(`/orders/${row.orderId}`)}
            >
              <div className={styles.progressTop}>
                <div>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/orders/${row.orderId}`);
                    }}
                  >
                    {row.orderNumber}
                  </button>
                  <div className={styles.orderMeta}>
                    {[row.customer, row.store, row.createdAt].filter(Boolean).join(" · ")}
                  </div>
                </div>
                <span className={styles.stars}>{row.rating > 0 ? `${row.rating}★` : "—"}</span>
              </div>
              {row.comment ? <div className={styles.comment}>{row.comment}</div> : null}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
