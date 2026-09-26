import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { OpsRangeFilter, type OpsRangeFilterValue } from "@/modules/opsAdmin/components/OpsRangeFilter";
import { useCodCollection, useCodRiderTransfers } from "@/modules/opsAdmin/hooks/useAdminOps";
import type { KpiStat } from "@/types/common";
import type { CodLedgerState, CodRiderTransferState } from "@/types/adminOps";
import styles from "./OpsAdmin.module.css";

const STATE_TONE: Record<CodLedgerState, "green" | "amber" | "red" | "blue" | "grey"> = {
  pending: "amber",
  collected: "blue",
  submitted: "blue",
  verified: "green",
  settled: "green",
  exception: "red",
};

const TRANSFER_TONE: Record<CodRiderTransferState, "green" | "amber" | "red"> = {
  clear: "green",
  pending_transfer: "amber",
  blocked: "red",
};

const TRANSFER_LABEL: Record<CodRiderTransferState, string> = {
  clear: "Transferred",
  pending_transfer: "Pending transfer",
  blocked: "Blocked — not transferred",
};

type CodTab = "orders" | "transfers";

export function CodCollectionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<CodTab>("transfers");
  const [range, setRange] = useState<OpsRangeFilterValue>({
    range: "today",
    from: "",
    to: "",
  });
  const ordersQuery = useCodCollection(range);
  const transfersQuery = useCodRiderTransfers(range);

  const active = tab === "orders" ? ordersQuery : transfersQuery;
  const orderData = ordersQuery.data;
  const transferData = transfersQuery.data;

  const kpis: KpiStat[] = useMemo(() => {
    if (tab === "orders") {
      if (!orderData) return [];
      const fromSummary = orderData.summary.slice(0, 5).map((m) => ({ value: m.value, label: m.label }));
      return [
        { value: orderData.realizedRevenue, label: "Settled revenue" },
        ...fromSummary,
      ].slice(0, 6);
    }
    if (!transferData) return [];
    return transferData.summary.slice(0, 6).map((m) => ({ value: m.value, label: m.label }));
  }, [tab, orderData, transferData]);

  if (active.isLoading) return <CardSkeleton />;
  if (active.isError) {
    return (
      <ErrorState
        message={tab === "orders" ? "Couldn't load COD collection." : "Couldn't load COD transfers."}
        onRetry={() => void active.refetch()}
      />
    );
  }

  const orderRows = orderData?.rows ?? [];
  const transferRows = transferData?.rows ?? [];

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="cod-collection" />

      <Card className={styles.hintCard}>
        {tab === "orders" ? (
          <>
            <div className={styles.realized}>Settled (realized): {orderData?.realizedRevenue ?? "—"}</div>
            <p className={styles.realizedHint}>
              Pending COD is cash in transit — it is never counted as realized revenue.
            </p>
          </>
        ) : (
          <>
            <div className={styles.realized}>Rider COD transfer to company</div>
            <p className={styles.realizedHint}>
              {transferData?.note ||
                "Riders must transfer COD at shift end. Undeposited cash blocks going online the next day."}
            </p>
          </>
        )}
      </Card>

      <div className={styles.tabs}>
        {(
          [
            ["transfers", "Rider transfers"],
            ["orders", "Orders"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={styles.tabChip}
            data-active={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <Card className={styles.filterCard}>
        <OpsRangeFilter value={range} onChange={setRange} />
      </Card>

      {kpis.length > 0 ? <KpiStrip kpis={kpis} moduleId="cod-collection" /> : null}

      {tab === "transfers" ? (
        transferRows.length === 0 ? (
          <EmptyState title="No rider COD float for this range" />
        ) : (
          <Card className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rider</th>
                  <th>Cash in hand</th>
                  <th>Collected</th>
                  <th>Deposited</th>
                  <th>Last transfer</th>
                  <th>Pending orders</th>
                  <th>Online</th>
                  <th>Transfer status</th>
                </tr>
              </thead>
              <tbody>
                {transferRows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => navigate(`/rider-details/${row.riderId}`)}
                      >
                        {row.riderName}
                      </button>
                      <div className={styles.orderMeta}>
                        {[row.phone, row.hub].filter(Boolean).join(" · ")}
                      </div>
                    </td>
                    <td>{row.cashInHand}</td>
                    <td>{row.collectedToday}</td>
                    <td>{row.depositedToday}</td>
                    <td>
                      {row.lastDepositRef || "—"}
                      {row.lastDepositAt ? (
                        <div className={styles.orderMeta}>
                          {new Date(row.lastDepositAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      ) : null}
                    </td>
                    <td>{row.ordersPendingSettle || "—"}</td>
                    <td>
                      <Badge
                        label={row.isOnline ? "Online" : "Offline"}
                        tone={row.isOnline ? "green" : "grey"}
                      />
                    </td>
                    <td>
                      <Badge
                        label={TRANSFER_LABEL[row.transferStatus]}
                        tone={TRANSFER_TONE[row.transferStatus]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )
      ) : orderRows.length === 0 ? (
        <EmptyState title="No COD rows for this range" />
      ) : (
        <Card className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Order value</th>
                <th>Collected</th>
                <th>Pending</th>
                <th>Submitted</th>
                <th>Verified</th>
                <th>Settled</th>
                <th>Exception</th>
                <th>State</th>
              </tr>
            </thead>
            <tbody>
              {orderRows.map((row) => (
                <tr key={row.id}>
                  <td>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={() => navigate(`/orders/${row.orderId}`)}
                    >
                      {row.orderNumber}
                    </button>
                    {row.rider || row.store ? (
                      <div className={styles.orderMeta}>
                        {[row.rider, row.store].filter(Boolean).join(" · ")}
                      </div>
                    ) : null}
                  </td>
                  <td>{row.orderValue}</td>
                  <td>{row.collected}</td>
                  <td>{row.pending}</td>
                  <td>{row.submitted}</td>
                  <td>{row.verified}</td>
                  <td>{row.settled}</td>
                  <td>{row.exception}</td>
                  <td>
                    <Badge label={row.state} tone={STATE_TONE[row.state]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
