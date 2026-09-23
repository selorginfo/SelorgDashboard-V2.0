import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Plus, RotateCcw, Search } from "lucide-react";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { DataTable } from "@/components/tables/DataTable";
import { usePermission } from "@/hooks/usePermission";
import { formatDate, formatInr, localDay } from "@/lib/format";
import { bulkOrderTotals } from "@/services/bulkOrders/bulkOrderService";
import { BULK_ORDER_STATUSES, BULK_PAYMENT_STATUSES } from "@/services/bulkOrders/mockBulkOrderData";
import { BULK_STATUS_TONE, PAYMENT_STATUS_TONE } from "@/modules/bulkOrders/tones";
import type { BulkOrder } from "@/types/bulkOrder";
import type { BulkOrderAction } from "@/modules/bulkOrders/pages/BulkOrdersPage";
import styles from "@/components/workspace/RecordModule.module.css";

const FILTER_KEYS = ["id", "client", "status", "pay", "from", "to"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];
type Filters = Record<FilterKey, string>;

const ALL = "all";

type Row = BulkOrder & { quantity: number; total: number };

function readFilters(params: URLSearchParams): Filters {
  return Object.fromEntries(FILTER_KEYS.map((k) => [k, params.get(k) ?? ""])) as Filters;
}

export function BulkOrderList({
  orders,
  onAction,
  onCreate,
}: {
  orders: BulkOrder[];
  onAction: (o: BulkOrder, action: BulkOrderAction) => void;
  onCreate: () => void;
}) {
  const navigate = useNavigate();
  const { can } = usePermission();
  // Applied filters live in the URL so "Back" from an order detail restores the same view.
  const [params, setParams] = useSearchParams();
  const applied = readFilters(params);
  const [draft, setDraft] = useState<Filters>(applied);
  const paramKey = params.toString();
  // Keep the form in step with the URL (browser back/forward, chip clicks).
  useEffect(() => setDraft(readFilters(new URLSearchParams(paramKey))), [paramKey]);
  const canEdit = can("bulk-orders", "edit");

  function apply(next: Filters) {
    const p = new URLSearchParams();
    FILTER_KEYS.forEach((k) => next[k] && next[k] !== ALL && p.set(k, next[k]));
    setParams(p, { replace: true });
  }

  function reset() {
    const empty = Object.fromEntries(FILTER_KEYS.map((k) => [k, ""])) as Filters;
    setDraft(empty);
    apply(empty);
  }

  function openDetail(id: string) {
    navigate(`/bulk-orders/${id}`, { state: { from: `/bulk-orders?${params.toString()}` } });
  }

  const rows = useMemo<Row[]>(
    () =>
      orders.map((o) => {
        const t = bulkOrderTotals(o);
        return { ...o, quantity: t.quantity, total: t.total };
      }),
    [orders]
  );

  const filtered = useMemo(() => {
    const id = applied.id.trim().toLowerCase();
    const client = applied.client.trim().toLowerCase();
    return rows.filter((o) => {
      if (id && !o.id.toLowerCase().includes(id)) return false;
      if (client && !(o.business + " " + o.contactName).toLowerCase().includes(client)) return false;
      if (applied.status && o.status !== applied.status) return false;
      if (applied.pay && o.paymentStatus !== applied.pay) return false;
      const day = localDay(o.orderDate);
      if (applied.from && day < applied.from) return false;
      if (applied.to && day > applied.to) return false;
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, params]);

  const count = (s: string) => orders.filter((o) => o.status === s).length;
  const activeFilterCount = FILTER_KEYS.filter((k) => applied[k]).length;

  const columns = useMemo<ColumnDef<Row, unknown>[]>(
    () => [
      { id: "id", header: "Bulk Order ID", accessorKey: "id", cell: ({ row }) => <span className={styles.mono}>{row.original.id}</span> },
      {
        id: "business",
        header: "Customer / Business",
        accessorKey: "business",
        cell: ({ row }) => (
          <div>
            <div>{row.original.business}</div>
            <div className={styles.muted} style={{ fontSize: 11 }}>
              {row.original.contactName}
            </div>
          </div>
        ),
      },
      { id: "items", header: "Items", accessorFn: (o) => o.items.length, cell: ({ getValue }) => `${getValue() as number} SKUs` },
      { id: "quantity", header: "Quantity", accessorKey: "quantity", cell: ({ getValue }) => <span className={styles.mono}>{(getValue() as number).toLocaleString("en-IN")}</span> },
      { id: "total", header: "Order Value", accessorKey: "total", cell: ({ getValue }) => <span className={styles.mono}>{formatInr(getValue() as number)}</span> },
      { id: "orderDate", header: "Order Date", accessorKey: "orderDate", cell: ({ row }) => formatDate(row.original.orderDate) },
      {
        id: "deliveryDate",
        header: "Delivery Date",
        accessorKey: "deliveryDate",
        cell: ({ row }) => (
          <div>
            <div>{formatDate(row.original.deliveryDate)}</div>
            <div className={styles.muted} style={{ fontSize: 11 }}>
              {row.original.slot}
            </div>
          </div>
        ),
      },
      { id: "status", header: "Delivery Status", accessorKey: "status", cell: ({ row }) => <Badge label={row.original.status} tone={BULK_STATUS_TONE[row.original.status]} /> },
      {
        id: "paymentStatus",
        header: "Payment Status",
        accessorKey: "paymentStatus",
        cell: ({ row }) => <Badge label={row.original.paymentStatus} tone={PAYMENT_STATUS_TONE[row.original.paymentStatus]} />,
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) => {
          const o = row.original;
          const closed = o.status === "Delivered" || o.status === "Cancelled";
          return (
            <div className={styles.rowActions} onClick={(e) => e.stopPropagation()}>
              <button type="button" className={styles.linkBtn} onClick={() => openDetail(o.id)}>
                View
              </button>
              {canEdit ? (
                <button type="button" className={styles.linkBtn} disabled={closed} onClick={() => onAction(o, "status")}>
                  Manage
                </button>
              ) : null}
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, onAction, canEdit]
  );

  const openValue = orders
    .filter((o) => o.status !== "Cancelled" && o.status !== "Delivered")
    .reduce((sum, o) => sum + bulkOrderTotals(o).total, 0);

  return (
    <div className={styles.wrap}>
      <div className={styles.pageHead}>
        <div>
          <div className={styles.pageTitle}>Bulk Orders</div>
          <div className={styles.pageSub}>
            B2B orders from institutional clients — process, pick, assign and deliver high-volume orders separately
            from last-mile delivery. {formatInr(openValue)} in open orders.
          </div>
        </div>
        <div className={styles.headActions}>
          {canEdit ? (
            <Button size="sm" variant="primary" onClick={onCreate}>
              <Plus size={13} /> Create bulk order
            </Button>
          ) : null}
        </div>
      </div>

      <KpiStrip
        moduleId="bulk-orders"
        kpis={[
          { value: String(orders.length), label: "Total Bulk Orders" },
          { value: String(count("Pending")), label: "Pending" },
          { value: String(count("Processing")), label: "Processing" },
          { value: String(count("Ready for Delivery")), label: "Ready for Delivery" },
          { value: String(count("Out for Delivery")), label: "Out for Delivery" },
          { value: String(count("Delivered")), label: "Delivered" },
          { value: String(count("Cancelled")), label: "Cancelled", color: count("Cancelled") ? "var(--red-tx)" : undefined },
        ]}
      />

      <div className={styles.chips}>
        {["", ...BULK_ORDER_STATUSES].map((s) => (
          <button
            key={s || "all"}
            type="button"
            className={styles.chip}
            data-active={applied.status === s}
            onClick={() => {
              setDraft((d) => ({ ...d, status: s }));
              apply({ ...applied, status: s });
            }}
          >
            {s || "All"}
            <span className={styles.chipCount}>{s ? count(s) : orders.length}</span>
          </button>
        ))}
      </div>

      <Card className={styles.filterCard}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            apply(draft);
          }}
        >
          <div className={styles.filterGrid}>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Bulk order ID</span>
              <input className={styles.control} value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} placeholder="BLK-4412" />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Customer / business</span>
              <input className={styles.control} value={draft.client} onChange={(e) => setDraft({ ...draft, client: e.target.value })} placeholder="Business or contact" />
            </label>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Delivery status</span>
              <Select
                value={draft.status || ALL}
                onValueChange={(v) => setDraft({ ...draft, status: v === ALL ? "" : v })}
                options={[{ value: ALL, label: "All statuses" }, ...BULK_ORDER_STATUSES.map((s) => ({ value: s, label: s }))]}
                aria-label="Delivery status"
              />
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Payment status</span>
              <Select
                value={draft.pay || ALL}
                onValueChange={(v) => setDraft({ ...draft, pay: v === ALL ? "" : v })}
                options={[{ value: ALL, label: "All payments" }, ...BULK_PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))]}
                aria-label="Payment status"
              />
            </div>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ordered from</span>
              <input type="date" className={styles.control} value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft({ ...draft, from: e.target.value })} />
            </label>
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Ordered to</span>
              <input type="date" className={styles.control} value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft({ ...draft, to: e.target.value })} />
            </label>
          </div>
          <div className={styles.filterActions}>
            <span className={styles.filterNote}>
              {filtered.length} of {orders.length} bulk orders
              {activeFilterCount ? ` · ${activeFilterCount} filter${activeFilterCount > 1 ? "s" : ""} applied` : ""}
            </span>
            <Button type="button" size="sm" variant="ghost" onClick={reset} disabled={!activeFilterCount && !FILTER_KEYS.some((k) => draft[k])}>
              <RotateCcw size={13} /> Reset
            </Button>
            <Button type="submit" size="sm" variant="primary">
              <Search size={13} /> Search
            </Button>
          </div>
        </form>
      </Card>

      <Card className={styles.tableCard}>
        <DataTable
          columns={columns}
          data={filtered}
          searchPlaceholder="Quick search in results"
          onRowClick={(o) => openDetail(o.id)}
          emptyTitle="No bulk orders match these filters"
          emptyDescription="Try a different status or reset the filters."
        />
      </Card>
    </div>
  );
}
