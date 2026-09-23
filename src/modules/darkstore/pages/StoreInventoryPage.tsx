import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { darkStoreInventoryService, type StoreInventoryItem } from "@/services/darkStoreInventory/darkStoreInventoryService";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { KpiStat } from "@/types/common";
import styles from "./StoreInventoryPage.module.css";

const ALL = "All stores";

function AvailabilityBar({ qty, reserved }: { qty: number; reserved: number }) {
  const total = qty + reserved;
  if (total === 0) return <span className={styles.barEmpty}>—</span>;
  const availPct = Math.round((qty / total) * 100);
  return (
    <div className={styles.bar} title={`${qty} available · ${reserved} reserved`}>
      <div className={styles.barAvail} style={{ width: `${availPct}%` }} />
      <div className={styles.barReserved} style={{ width: `${100 - availPct}%` }} />
    </div>
  );
}

function statusFor(
  qty: number,
  threshold: number,
  isAvailable: boolean,
): { label: string; tone: "green" | "amber" | "red" | "grey" } {
  if (!isAvailable) return { label: "Unavailable", tone: "grey" };
  if (qty === 0) return { label: "Out of stock", tone: "red" };
  if (qty <= threshold) return { label: "Low stock", tone: "amber" };
  return { label: "In stock", tone: "green" };
}

export function StoreInventoryPage() {
  const [tab, setTab] = useState(ALL);
  const [search, setSearch] = useState("");
  const [adjustTarget, setAdjustTarget] = useState<StoreInventoryItem | null>(null);
  const [adjustQty, setAdjustQty] = useState("0");
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const queryClient = useQueryClient();
  const canEdit = can("store-inv", "edit") || can("store-inv", "create") || can("racks", "create");

  const { data: storeRecords = [] } = useStoreRecords();

  const { data: inventoryData, isLoading, isError } = useQuery({
    queryKey: ["ds-inventory-all"],
    queryFn: () => darkStoreInventoryService.list(),
    staleTime: 30_000,
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      darkStoreInventoryService.update(id, { quantity }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ds-inventory-all"] });
      pushToast("Stock quantity updated", "success");
      setAdjustTarget(null);
    },
    onError: (e) => pushToast((e as Error).message || "Couldn't update stock", "error"),
  });

  const items = inventoryData?.items ?? [];

  const storeNameById = useMemo(() => {
    const m: Record<string, string> = {};
    for (const s of storeRecords) m[s._id] = s.name;
    return m;
  }, [storeRecords]);

  const storeTabs = useMemo(() => {
    const names = [...new Set(items.map((i) => storeNameById[String(i.storeId)] ?? String(i.storeId)))];
    return names.filter(Boolean);
  }, [items, storeNameById]);

  const tabs = [ALL, ...storeTabs];

  const visibleItems = useMemo(() => {
    let rows = tab === ALL ? items : items.filter((i) => (storeNameById[String(i.storeId)] ?? String(i.storeId)) === tab);
    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (i) =>
          (i.product?.sku ?? "").toLowerCase().includes(q) ||
          (i.product?.name ?? "").toLowerCase().includes(q),
      );
    }
    return rows;
  }, [tab, items, storeNameById, search]);

  const kpis: KpiStat[] = useMemo(() => {
    const totalSkus = items.length;
    const availableCount = items.filter((i) => i.isAvailable && i.quantity > 0).length;
    const totalReserved = items.reduce((s, i) => s + i.reservedQty, 0);
    const outOfStock = items.filter((i) => i.quantity === 0).length;
    const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length;
    return [
      { value: totalSkus.toLocaleString(), label: "SKUs stocked" },
      { value: availableCount.toLocaleString(), label: "Available" },
      { value: totalReserved.toLocaleString(), label: "Reserved" },
      { value: String(outOfStock), label: "Out of stock", color: outOfStock > 0 ? "var(--red-tx)" : undefined },
      { value: String(lowStock), label: "Low stock", color: lowStock > 0 ? "var(--amber-tx, #92400e)" : undefined },
    ];
  }, [items]);

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={kpis} moduleId="store-inv" />

      <div className={styles.tabs}>
        {tabs.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <input
          type="search"
          placeholder="Search SKU or product…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ fontSize: 12, padding: "6px 10px", borderRadius: 6, border: "1px solid var(--border)", minWidth: 180 }}
        />
      </div>

      {isLoading ? (
        <p className={styles.emptyMsg}>Loading inventory…</p>
      ) : isError ? (
        <p className={styles.errorMsg}>Failed to load inventory.</p>
      ) : visibleItems.length === 0 ? (
        <EmptyState title="No inventory records" description="Add products to a dark store to see them here." />
      ) : (
        <Card className={styles.tableCard}>
          <div className={styles.tableScroll}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Store</th>
                  <th>Qty on hand</th>
                  <th>Reserved</th>
                  <th>Stock level</th>
                  <th>Low stock at</th>
                  <th>Status</th>
                  {canEdit ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {visibleItems.map((item) => {
                  const storeName = storeNameById[String(item.storeId)] ?? String(item.storeId);
                  const st = statusFor(item.quantity, item.lowStockThreshold, item.isAvailable);
                  return (
                    <tr key={item._id}>
                      <td className={styles.mono}>{item.product?.sku ?? "—"}</td>
                      <td>{item.product?.name ?? "Unknown product"}</td>
                      <td>{storeName}</td>
                      <td className={styles.mono}>{item.quantity}</td>
                      <td className={styles.mono}>{item.reservedQty}</td>
                      <td>
                        <AvailabilityBar qty={item.quantity} reserved={item.reservedQty} />
                      </td>
                      <td className={styles.mono}>{item.lowStockThreshold}</td>
                      <td>
                        <Badge label={st.label} tone={st.tone} />
                      </td>
                      {canEdit ? (
                        <td>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setAdjustTarget(item);
                              setAdjustQty(String(item.quantity));
                            }}
                          >
                            Adjust
                          </Button>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={!!adjustTarget}
        onOpenChange={(v) => !v && setAdjustTarget(null)}
        title={adjustTarget ? `Adjust stock — ${adjustTarget.product?.sku ?? "SKU"}` : "Adjust stock"}
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setAdjustTarget(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              variant="primary"
              isLoading={adjustMutation.isPending}
              onClick={() => {
                if (!adjustTarget) return;
                const quantity = Number(adjustQty);
                if (!Number.isFinite(quantity) || quantity < 0) {
                  pushToast("Quantity must be zero or greater", "error");
                  return;
                }
                adjustMutation.mutate({ id: adjustTarget._id, quantity });
              }}
            >
              Update stock
            </Button>
          </>
        }
      >
        <label style={{ fontSize: 12, fontWeight: 600, display: "block" }}>
          New quantity on hand
          <input
            type="number"
            min={0}
            value={adjustQty}
            onChange={(e) => setAdjustQty(e.target.value)}
            style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
          />
        </label>
      </Dialog>
    </div>
  );
}
