import { MapPin, Phone, Store } from "lucide-react";
import type { Order, OrderActionId, OrderLogEntry } from "@/types/order";
import { ORDER_ACTION_IDS } from "@/types/order";
import { Card } from "@/components/ui/Card";
import styles from "./OrderActionsPanel.module.css";

export function OrderActionsPanel({
  order,
  onAction,
  canEdit,
  canRefund,
  activity = [],
}: {
  order: Order;
  onAction: (action: OrderActionId) => void;
  canEdit: boolean;
  canRefund: boolean;
  /** Real timeline/logs from GET /admin/orders/:id/logs — never synthesized. */
  activity?: OrderLogEntry[];
}) {
  const availableActions = ORDER_ACTION_IDS.filter((a) => {
    if (a === "Initiate refund") return canRefund;
    if (a === "Cancel order") return canEdit;
    return true;
  });

  return (
    <Card className={styles.card}>
      <div className={styles.customerSection}>
        <div className={styles.customerName}>{order.customer || "—"}</div>
        <div className={styles.customerMeta}>
          <Phone size={10} strokeWidth={2} />
          {order.phone || "No phone"}
        </div>
        {order.address && (
          <div className={styles.customerMeta}>
            <MapPin size={10} strokeWidth={2} />
            {order.address}
          </div>
        )}
        {order.pickupStore && (
          <div className={styles.customerMeta}>
            <Store size={10} strokeWidth={2} />
            <span className={styles.pickupLabel}>Pickup store:</span>
            {order.pickupStore}
          </div>
        )}
      </div>

      <div className={styles.title}>Act on this order</div>
      <div className={styles.actions}>
        {availableActions.map((a) => (
          <button key={a} type="button" className={styles.actionBtn} onClick={() => onAction(a)}>
            {a}
          </button>
        ))}
      </div>

      <div className={styles.divider} />

      <div className={styles.summary}>
        <div className={styles.summaryRow}>
          <span>Payment</span>
          <span className={styles.summaryValue}>{order.paymentLabel ?? order.payment}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>SLA</span>
          <span className={styles.summaryValue}>{order.sla}</span>
        </div>
        <div className={styles.summaryRow}>
          <span>Zone</span>
          <span className={styles.summaryValue}>{order.zone || "—"}</span>
        </div>
        <div className={styles.summaryTotal}>
          <span>Total</span>
          <span className={styles.summaryTotalValue}>{order.value}</span>
        </div>
      </div>

      {order.refundLine ? <div className={styles.refundBanner}>{order.refundLine}</div> : null}
      {order.cancelLine ? <div className={styles.cancelBanner}>Cancelled — {order.cancelLine}</div> : null}

      <div className={styles.liveActivityTitle}>Live activity</div>
      <div className={styles.liveActivityList}>
        {activity.length === 0 ? (
          <div className={styles.liveActivityRow}>
            <span className={styles.liveActivityDot} />
            <div>
              <div className={styles.liveActivityStage}>No timeline events yet</div>
              <div className={styles.liveActivityMeta}>Loaded from order logs API</div>
            </div>
          </div>
        ) : (
          [...activity].reverse().map((entry) => (
            <div key={entry.id} className={styles.liveActivityRow}>
              <span className={styles.liveActivityDot} />
              <div>
                <div className={styles.liveActivityStage}>{entry.name || entry.note || "Update"}</div>
                <div className={styles.liveActivityMeta}>
                  {entry.time || "—"} · {entry.who}
                  {entry.note && entry.name ? ` · ${entry.note}` : ""}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
