import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  useAssignBulkStaff,
  useBulkOrders,
  useCreateBulkOrder,
  useSetBulkOrderStatus,
  useSetBulkPaymentStatus,
} from "@/modules/bulkOrders/hooks/useBulkOrders";
import { BulkOrderList } from "@/modules/bulkOrders/components/BulkOrderList";
import { BulkOrderDetail } from "@/modules/bulkOrders/components/BulkOrderDetail";
import { AssignBulkStaffDialog, CreateBulkOrderDialog, UpdateBulkStatusDialog } from "@/modules/bulkOrders/components/BulkOrderDialogs";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import type { BulkOrder, BulkOrderStatus } from "@/types/bulkOrder";
import styles from "@/components/workspace/RecordModule.module.css";

export type BulkOrderAction = "status" | "assign-rider" | "assign-picker" | "cancel" | BulkOrderStatus;

/**
 * Bulk Orders — B2B orders from institutional clients, managed end to end (processing, picking,
 * rider assignment, dispatch, delivery). It sits in the Delivery module beside the bulk-delivery
 * screens it feeds. `/bulk-orders` lists orders, `/bulk-orders/:bulkOrderId` opens one.
 */
export function BulkOrdersPage() {
  const { bulkOrderId } = useParams<{ bulkOrderId: string }>();
  const navigate = useNavigate();
  const { data: orders, isLoading, isError, refetch } = useBulkOrders();
  const setStatus = useSetBulkOrderStatus();
  const setPayment = useSetBulkPaymentStatus();
  const assignStaff = useAssignBulkStaff();
  const createOrder = useCreateBulkOrder();
  const pushToast = useUiStore((s) => s.pushToast);

  const [createOpen, setCreateOpen] = useState(false);
  const [statusFor, setStatusFor] = useState<BulkOrder | null>(null);
  const [assignFor, setAssignFor] = useState<{ order: BulkOrder; role: "rider" | "picker" } | null>(null);
  const [cancelFor, setCancelFor] = useState<BulkOrder | null>(null);

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <CardSkeleton />
        <TableSkeleton />
      </div>
    );
  }
  if (isError || !orders) {
    return <ErrorState message="Couldn't load bulk orders." onRetry={() => refetch()} />;
  }

  const onError = (fallback: string) => (e: unknown) => pushToast((e as Error).message || fallback, "error");

  function applyStatus(o: BulkOrder, status: BulkOrderStatus, note?: string, done?: () => void) {
    setStatus.mutate(
      { id: o.id, status, note: note || undefined },
      {
        onSuccess: () => {
          pushToast(`${o.id} — ${status}`, "success");
          done?.();
        },
        onError: onError("Couldn't update the order"),
      }
    );
  }

  function onAction(o: BulkOrder, action: BulkOrderAction) {
    if (action === "status") setStatusFor(o);
    else if (action === "assign-rider") setAssignFor({ order: o, role: "rider" });
    else if (action === "assign-picker") setAssignFor({ order: o, role: "picker" });
    else if (action === "cancel" || action === "Cancelled") setCancelFor(o);
    else applyStatus(o, action);
  }

  const detail = bulkOrderId ? orders.find((o) => o.id === bulkOrderId) : undefined;
  const busy = setStatus.isPending || assignStaff.isPending;

  return (
    <>
      {bulkOrderId ? (
        <BulkOrderDetail order={detail} orderId={bulkOrderId} onAction={onAction} isBusy={busy} />
      ) : (
        <BulkOrderList orders={orders} onAction={onAction} onCreate={() => setCreateOpen(true)} />
      )}

      <CreateBulkOrderDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        isSubmitting={createOrder.isPending}
        onSubmit={(input) =>
          createOrder.mutate(input, {
            onSuccess: (o) => {
              pushToast(`Bulk order ${o.id} created`, "success");
              setCreateOpen(false);
              navigate(`/bulk-orders/${o.id}`);
            },
            onError: onError("Couldn't create the order"),
          })
        }
      />

      <UpdateBulkStatusDialog
        order={statusFor}
        onClose={() => setStatusFor(null)}
        isSubmitting={setStatus.isPending || setPayment.isPending}
        onSubmit={async ({ status, paymentStatus, note }) => {
          if (!statusFor) return;
          const o = statusFor;
          try {
            if (paymentStatus !== o.paymentStatus) {
              await setPayment.mutateAsync({ id: o.id, paymentStatus });
            }
            if (status !== o.status) {
              await setStatus.mutateAsync({ id: o.id, status, note: note || undefined });
            }
            pushToast(`${o.id} updated`, "success");
            setStatusFor(null);
          } catch (e) {
            onError("Couldn't update the order")(e);
          }
        }}
      />

      {/* Mounted only while open so the rider/picker directory is fetched on demand. */}
      {assignFor ? (
        <AssignBulkStaffDialog
          order={assignFor.order}
          role={assignFor.role}
          onClose={() => setAssignFor(null)}
          isSubmitting={assignStaff.isPending}
          onSubmit={(name) => {
            const { order, role } = assignFor;
            assignStaff.mutate(
              { id: order.id, role, name },
              {
                onSuccess: () => {
                  pushToast(`${name} assigned to ${order.id}`, "success");
                  setAssignFor(null);
                },
                onError: onError(`Couldn't assign the ${role}`),
              }
            );
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(cancelFor)}
        onOpenChange={(o) => (!o ? setCancelFor(null) : undefined)}
        title={`Cancel ${cancelFor?.id ?? ""}?`}
        description={`${cancelFor?.business ?? "The client"}'s order stops wherever it is in fulfilment. This can't be undone.`}
        confirmLabel="Cancel order"
        tone="danger"
        isLoading={setStatus.isPending}
        onConfirm={() => cancelFor && applyStatus(cancelFor, "Cancelled", "Cancelled by admin", () => setCancelFor(null))}
      />
    </>
  );
}
