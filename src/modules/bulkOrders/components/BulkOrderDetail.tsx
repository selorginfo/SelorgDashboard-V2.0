import type { ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StageStepper } from "@/components/workspace/StageStepper";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatDateTime, formatInr } from "@/lib/format";
import { bulkOrderTotals } from "@/services/bulkOrders/bulkOrderService";
import { BULK_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/modules/bulkOrders/tones";
import { BULK_ORDER_STAGES, type BulkOrder } from "@/types/bulkOrder";
import type { BulkOrderAction } from "@/modules/bulkOrders/pages/BulkOrdersPage";
import styles from "@/components/workspace/RecordModule.module.css";

function Row({ label, children, total }: { label: string; children: ReactNode; total?: boolean }) {
  return (
    <div className={total ? styles.totalRow : styles.infoRow}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{children}</span>
    </div>
  );
}

export function BulkOrderDetail({
  order,
  orderId,
  onAction,
  isBusy,
}: {
  order: BulkOrder | undefined;
  orderId: string;
  onAction: (o: BulkOrder, action: BulkOrderAction) => void;
  isBusy?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const { can } = usePermission();
  const backTo = (location.state as { from?: string } | null)?.from ?? "/bulk-orders";

  const back = (
    <Button size="sm" variant="ghost" className={styles.back} onClick={() => navigate(backTo)}>
      <ArrowLeft size={13} /> All bulk orders
    </Button>
  );

  if (!order) {
    return (
      <div className={styles.wrap}>
        {back}
        <EmptyState title={`Bulk order ${orderId} not found`} description="It may have been removed, or the link is wrong." />
      </div>
    );
  }

  const o = order;
  const t = bulkOrderTotals(o);
  const canEdit = can("bulk-orders", "edit");
  const canAssign = can("bulk-orders", "assign");
  const closed = o.status === "Delivered" || o.status === "Cancelled";

  /** The next step in fulfilment, offered as the primary action. */
  const next: { label: string; action: BulkOrderAction } | null = closed
    ? null
    : o.status === "Pending"
      ? { label: "Mark as processing", action: "Processing" }
      : o.status === "Processing"
        ? o.picker
          ? { label: "Mark as ready", action: "Ready for Delivery" }
          : { label: "Assign picker", action: "assign-picker" }
        : o.status === "Ready for Delivery"
          ? o.rider
            ? { label: "Mark out for delivery", action: "Out for Delivery" }
            : { label: "Assign rider", action: "assign-rider" }
          : { label: "Mark as delivered", action: "Delivered" };
  const nextAllowed = next && (next.action.startsWith("assign") ? canAssign : canEdit);

  return (
    <div className={styles.wrap}>
      {back}

      <Card className={styles.headerCard}>
        <div className={styles.headerTop}>
          <div>
            <div className={styles.recordId}>
              {o.id}
              <Badge label={o.status} tone={BULK_STATUS_TONE[o.status]} />
            </div>
            <div className={styles.recordSub}>
              {o.business} · {o.store} · ordered {formatDateTime(o.orderDate)}
            </div>
          </div>
          <div className={styles.headActions}>
            {next && nextAllowed ? (
              <Button size="sm" variant="primary" isLoading={isBusy} onClick={() => onAction(o, next.action)}>
                {next.label}
              </Button>
            ) : null}
            {canAssign && !closed ? (
              <>
                <Button size="sm" onClick={() => onAction(o, "assign-picker")}>
                  {o.picker ? "Reassign picker" : "Assign picker"}
                </Button>
                <Button size="sm" onClick={() => onAction(o, "assign-rider")}>
                  {o.rider ? "Reassign rider" : "Assign rider"}
                </Button>
              </>
            ) : null}
            {canEdit && o.status !== "Cancelled" ? (
              <Button size="sm" onClick={() => onAction(o, "status")}>
                Update status
              </Button>
            ) : null}
            {canEdit && !closed ? (
              <Button size="sm" variant="danger" onClick={() => onAction(o, "cancel")}>
                Cancel order
              </Button>
            ) : null}
          </div>
        </div>
        <StageStepper stages={BULK_ORDER_STAGES} current={o.stage} halted={o.status === "Cancelled"} />
      </Card>

      <div className={styles.detailGrid}>
        <Card className={styles.infoCard}>
          <div className={styles.infoTitle}>Order information</div>
          <Row label="Bulk order ID">
            <span className={styles.mono}>{o.id}</span>
          </Row>
          <Row label="Customer / business">{o.business}</Row>
          <Row label="Order date">{formatDateTime(o.orderDate)}</Row>
          <Row label="Scheduled delivery">
            {formatDate(o.deliveryDate)} · {o.slot}
          </Row>
          <Row label="Delivery address">{o.address}</Row>
          <Row label="Contact">{o.contactName}</Row>
          <Row label="Phone">{o.phone}</Row>
          <Row label="Email">{o.email}</Row>
        </Card>

        <Card className={styles.infoCard}>
          <div className={styles.infoTitle}>Delivery</div>
          <Row label="Delivery status">
            <Badge label={o.status} tone={BULK_STATUS_TONE[o.status]} />
          </Row>
          <Row label="Fulfilling store">{o.store}</Row>
          <Row label="Assigned picker">{o.picker ?? "Not assigned"}</Row>
          <Row label="Assigned rider">{o.rider ?? "Not assigned"}</Row>
          <Row label="Delivery slot">
            {formatDate(o.deliveryDate)} · {o.slot}
          </Row>
          <Row label="Delivery address">{o.address}</Row>
        </Card>

        <Card className={styles.infoCard}>
          <div className={styles.infoTitle}>Payment</div>
          <Row label="Subtotal">{formatInr(t.subtotal)}</Row>
          <Row label="Discounts">{t.discount ? `− ${formatInr(t.discount)}` : "—"}</Row>
          <Row label="Delivery charges">{t.delivery ? formatInr(t.delivery) : "Free"}</Row>
          <Row label={`Taxes (GST ${Math.round(o.taxRate * 100)}%)`}>{formatInr(t.tax)}</Row>
          <Row label="Grand total" total>
            {formatInr(t.total)}
          </Row>
          <Row label="Payment status">
            <Badge label={o.paymentStatus} tone={PAYMENT_STATUS_TONE[o.paymentStatus]} />
          </Row>
          <Row label="Payment method">{o.paymentMethod}</Row>
        </Card>
      </div>

      <Card className={styles.infoCard}>
        <div className={styles.infoTitle}>
          Order items · {o.items.length} SKUs · {t.quantity.toLocaleString("en-IN")} units
        </div>
        <div className={styles.scrollX}>
          <table className={styles.itemsTable}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th className={styles.num}>Quantity</th>
                <th className={styles.num}>Unit Price</th>
                <th className={styles.num}>Total</th>
              </tr>
            </thead>
            <tbody>
              {o.items.map((it) => (
                <tr key={it.sku}>
                  <td>{it.product}</td>
                  <td className={styles.mono}>{it.sku}</td>
                  <td className={styles.num}>{it.qty}</td>
                  <td className={styles.num}>{formatInr(it.unitPrice)}</td>
                  <td className={styles.num}>{formatInr(it.qty * it.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className={styles.infoCard}>
        <div className={styles.infoTitle}>Order timeline</div>
        {[...o.history].reverse().map((e, i) => (
          <div key={`${e.at}-${i}`} className={styles.historyRow}>
            <span className={styles.historyTime}>{formatDateTime(e.at)}</span>
            <span className={styles.historyName}>{e.stage}</span>
            <span className={styles.historyWho}>{e.by}</span>
            {e.note ? <span className={styles.historyNote}>{e.note}</span> : null}
          </div>
        ))}
      </Card>
    </div>
  );
}
