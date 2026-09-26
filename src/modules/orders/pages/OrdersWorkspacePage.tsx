import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Download, Plus } from "lucide-react";
import { useOrders, useOrderLog, useAdvanceStage, useOrderAction, usePlaceOrder } from "@/modules/orders/hooks/useOrders";
import { PlaceOrderModal } from "@/modules/orders/components/PlaceOrderModal";
import type { PlaceOrderInput } from "@/services/orders/orderService";
import { OrderQueueList } from "@/modules/orders/components/OrderQueueList";
import { OrderStageStepper } from "@/modules/orders/components/OrderStageStepper";
import { FulfilmentChain } from "@/modules/orders/components/FulfilmentChain";
import { OrderItemsTable } from "@/modules/orders/components/OrderItemsTable";
import { OrderActionsPanel } from "@/modules/orders/components/OrderActionsPanel";
import { OrderActionDialog } from "@/modules/orders/components/OrderActionDialog";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { OrderActionId } from "@/types/order";
import styles from "./OrdersWorkspacePage.module.css";

const FILTERS = ["All", "Placed", "Confirmed", "Picking", "Packing", "Ready", "Out for delivery", "Delivered", "Exception"] as const;

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function OrdersWorkspacePage() {
  const { orderId: routeOrderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  // `?q=` lets other modules deep-link into a filtered queue (e.g. "View orders" on a customer).
  const [searchParams] = useSearchParams();
  const [date, setDate] = useState("");
  const { data: orders, isLoading, isError, refetch } = useOrders(date);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [activeAction, setActiveAction] = useState<OrderActionId | null>(null);
  const advanceStage = useAdvanceStage();
  const orderAction = useOrderAction();
  const placeOrder = usePlaceOrder();
  const [placeOrderOpen, setPlaceOrderOpen] = useState(false);
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = query.toLowerCase();
    return orders.filter((o) => {
      if (filter !== "All" && o.status !== filter) return false;
      if (!q) return true;
      return (o.id + o.customer + o.store + o.rider).toLowerCase().includes(q);
    });
  }, [orders, filter, query]);

  const routeOrderExists = routeOrderId ? orders?.some((o) => o.id === routeOrderId) : false;
  const selectedId = (routeOrderExists ? routeOrderId : undefined) ?? filtered[0]?.id ?? orders?.[0]?.id;
  const selectedOrder = orders?.find((o) => o.id === selectedId);
  const { data: log } = useOrderLog(selectedOrder?.id);

  if (isLoading) return <CardSkeleton />;
  if (isError || !orders) {
    return <ErrorState message="Couldn't load orders." onRetry={() => refetch()} />;
  }

  function selectOrder(id: string) {
    navigate(`/orders/${id}`);
  }

  function handleActionSubmit(values: Record<string, string>) {
    if (!activeAction || !selectedOrder) return;
    orderAction.mutate(
      { orderId: selectedOrder.id, action: activeAction, values },
      {
        onSuccess: () => {
          pushToast(`${activeAction} applied to ${selectedOrder.id}`, "success");
          setActiveAction(null);
        },
        onError: () => pushToast(`Couldn't apply ${activeAction}`, "error"),
      }
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.toolbar}>
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            className={styles.filterChip}
            data-active={f === filter}
            onClick={() => setFilter(f)}
          >
            {f}
          </button>
        ))}
        <div className={styles.spacer} />
        <input
          type="date"
          className={styles.dateInput}
          value={date}
          max={todayIso()}
          onChange={(e) => setDate(e.target.value)}
          aria-label="Filter by date"
        />
        <input
          className={styles.search}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Order, customer, store, rider"
          aria-label="Search orders"
        />
        {can("orders", "edit") ? (
          <Button size="sm" variant="primary" onClick={() => setPlaceOrderOpen(true)}>
            <Plus size={13} /> Place order
          </Button>
        ) : null}
        {can("orders", "export") ? (
          <Button
            size="sm"
            onClick={() => {
              const rows = [
                ["Order", "Customer", "Store", "Rider", "Status", "Total", "Placed"],
                ...filtered.map((o) => [
                  o.id,
                  o.customer,
                  o.store,
                  o.rider,
                  o.status,
                  o.value,
                  o.date,
                ]),
              ];
              const csv = rows
                .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
                .join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `orders-${date}.csv`;
              a.click();
              URL.revokeObjectURL(url);
              pushToast(`Exported ${filtered.length} orders`, "success");
            }}
          >
            <Download size={13} /> Export
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No orders match this filter" description="Try a different status or clear the search." />
      ) : (
        <div className={styles.board}>
          <OrderQueueList orders={filtered} selectedId={selectedOrder?.id} onSelect={selectOrder} />

          {!selectedOrder ? (
            <div className={styles.center}>
              <EmptyState title="Select an order" description="Pick an order from the queue to see its detail." />
            </div>
          ) : (
            <>
              <div className={styles.center}>
                <OrderStageStepper
                  orderId={selectedOrder.id}
                  customer={selectedOrder.customer}
                  store={selectedOrder.store}
                  date={selectedOrder.date}
                  stage={selectedOrder.stage}
                  onAdvance={() =>
                    advanceStage.mutate(
                      { orderId: selectedOrder.id, rawStatus: selectedOrder.rawStatus },
                      { onError: () => pushToast("Couldn't advance the order stage", "error") },
                    )
                  }
                  isAdvancing={advanceStage.isPending}
                />
                <FulfilmentChain order={selectedOrder} />
                <OrderItemsTable order={selectedOrder} />
                {log && log.length > 0 ? (
                  <div className={styles.activityCard}>
                    <div className={styles.activityTitle}>Activity</div>
                    {log.map((entry) => (
                      <div key={entry.id} className={styles.activityRow}>
                        <span className={styles.activityTime}>{entry.time}</span>
                        <span className={styles.activityName}>{entry.name}</span>
                        <span className={styles.activityWho}>{entry.who}</span>
                        {entry.note ? <span className={styles.activityNote}>{entry.note}</span> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <OrderActionsPanel
                order={selectedOrder}
                onAction={setActiveAction}
                canEdit={can("orders", "edit")}
                canRefund={can("orders", "refund")}
                activity={log ?? []}
              />
            </>
          )}
        </div>
      )}

      <OrderActionDialog
        action={activeAction}
        onClose={() => setActiveAction(null)}
        onSubmit={handleActionSubmit}
        isSubmitting={orderAction.isPending}
      />

      <PlaceOrderModal
        open={placeOrderOpen}
        onOpenChange={setPlaceOrderOpen}
        isLoading={placeOrder.isPending}
        onSubmit={(input: PlaceOrderInput) => {
          placeOrder.mutate(input, {
            onSuccess: (order) => {
              pushToast(`Order placed — ${order.id}`, "success");
              setPlaceOrderOpen(false);
              if (order.id) navigate(`/orders/${order.id}`);
            },
            onError: (e) => pushToast((e as Error).message, "error"),
          });
        }}
      />
    </div>
  );
}
