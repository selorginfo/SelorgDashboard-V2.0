import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useWarehouseInventory } from "@/modules/warehouse/hooks/useWarehouseInventory";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { useUiStore } from "@/store/uiStore";
import styles from "./WarehouseInventoryPage.module.css";

const TABS = ["All SKUs", "Low stock", "Out of stock"];

function parseQty(value: string): number | null {
  if (value === "—" || value === "") return null;
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function AvailabilityBar({ available, reserved }: { available: string; reserved: string }) {
  const avail = parseQty(available);
  const res = parseQty(reserved);
  if (avail === null || res === null || avail + res === 0) {
    return <span className={styles.barEmpty}>—</span>;
  }
  const total = avail + res;
  const availPct = Math.round((avail / total) * 100);
  return (
    <div className={styles.bar} title={`${avail} available · ${res} reserved`}>
      <div className={styles.barAvail} style={{ width: `${availPct}%` }} />
      <div className={styles.barReserved} style={{ width: `${100 - availPct}%` }} />
    </div>
  );
}

export function WarehouseInventoryPage() {
  const [tab, setTab] = useState(TABS[0] ?? "All SKUs");
  const { data: apiInventory = [], isLoading, refetch } = useWarehouseInventory();
  const rows = useMemo(() => {
    if (tab === "All SKUs") return apiInventory;
    return apiInventory.filter((r) => r.tab === tab);
  }, [tab, apiInventory]);
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [qty, setQty] = useState("0");

  const adjustMut = useMutation({
    mutationFn: async () => {
      const n = Number(qty);
      if (!selectedId) throw new Error("Select a row");
      if (!Number.isFinite(n) || n < 0) throw new Error("Quantity must be ≥ 0");
      return api.put(`/api/v1/admin/store-warehouse/warehouse-inventory/${selectedId}`, { quantity: n });
    },
    onSuccess: () => {
      pushToast("Inventory quantity updated", "success");
      setAdjustOpen(false);
      qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
    },
    onError: (e) => pushToast((e as Error).message || "Adjust failed", "error"),
  });

  const exportCsv = () => {
    const header = "SKU,Product,Available,Reserved,Status\n";
    const body = rows
      .map((r) => `${r.sku},${JSON.stringify(r.product)},${r.available},${r.reserved},${r.status.label}`)
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "warehouse-inventory.csv";
    a.click();
    URL.revokeObjectURL(url);
    pushToast("Inventory exported", "success");
  };

  return (
    <div className={styles.wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
          <Button size="sm" variant="secondary" onClick={exportCsv}>Export</Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => {
              const first = rows[0] ?? apiInventory[0];
              setSelectedId(first?.id ?? "");
              setQty(String(parseQty(first?.available ?? "0") ?? 0));
              setAdjustOpen(true);
            }}
          >
            Adjust stock
          </Button>
        </div>
      </div>

      <Card className={styles.tableCard}>
        <div className={styles.tableScroll}>
          {isLoading ? (
            <p style={{ padding: "24px", color: "var(--mu)", fontSize: "13px" }}>Loading inventory…</p>
          ) : rows.length === 0 ? (
            <p style={{ padding: "24px", color: "var(--mu)", fontSize: "13px" }}>No inventory data available for this tab.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Product</th>
                  <th>Batch</th>
                  <th>Expiry</th>
                  <th>Available</th>
                  <th>Reserved</th>
                  <th>Stock level</th>
                  <th>Location</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className={styles.mono}>{row.sku}</td>
                    <td>{row.product}</td>
                    <td className={styles.mono}>{row.batch}</td>
                    <td>{row.expiry}</td>
                    <td>{row.available}</td>
                    <td>{row.reserved}</td>
                    <td>
                      <AvailabilityBar available={row.available} reserved={row.reserved} />
                    </td>
                    <td>{row.location}</td>
                    <td>
                      <Badge label={row.status.label} tone={row.status.tone} />
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setSelectedId(row.id);
                          setQty(String(parseQty(row.available) ?? 0));
                          setAdjustOpen(true);
                        }}
                      >
                        Edit
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      <Dialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title="Adjust warehouse stock"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" isLoading={adjustMut.isPending} onClick={() => adjustMut.mutate()}>
              Save
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Inventory row
            <select
              value={selectedId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedId(id);
                const row = apiInventory.find((r) => r.id === id);
                setQty(String(parseQty(row?.available ?? "0") ?? 0));
              }}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            >
              <option value="">Select…</option>
              {apiInventory.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.sku} — {r.product} (qty {r.available})
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Quantity
            <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
