import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { useUiStore } from "@/store/uiStore";
import type { KpiStat } from "@/types/common";

type AdjRow = {
  id: string;
  sku: string;
  productName: string;
  type: string;
  change: number;
  reason: string;
  user: string;
  when: string;
};

type InvItem = {
  _id: string;
  quantity: number;
  product?: { sku?: string; name?: string } | null;
};

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

export function WarehouseAuditPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [inventoryId, setInventoryId] = useState("");
  const [sku, setSku] = useState("");
  const [productName, setProductName] = useState("");
  const [systemQty, setSystemQty] = useState("0");
  const [physicalQty, setPhysicalQty] = useState("0");

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["wh-adjustments"],
    queryFn: async (): Promise<AdjRow[]> => {
      const res = await api.get<unknown>("/api/v1/warehouse/inventory/adjustments");
      return extractList(res).map((raw, i) => {
        const ts = raw.timestamp ?? raw.createdAt;
        const d = ts ? new Date(String(ts)) : null;
        return {
          id: String(raw.id ?? raw._id ?? `ADJ-${i}`),
          sku: String(raw.sku ?? "—"),
          productName: String(raw.productName ?? "—"),
          type: String(raw.type ?? "adjustment"),
          change: Number(raw.change ?? 0),
          reason: String(raw.reason ?? "—"),
          user: String(raw.user ?? "—"),
          when: d && !Number.isNaN(d.getTime()) ? d.toLocaleString("en-IN") : "—",
        };
      });
    },
    staleTime: 20_000,
  });

  const { data: inventory } = useQuery({
    queryKey: ["wh-inventory-audit"],
    queryFn: async (): Promise<InvItem[]> => {
      const res = await api.get<{ items?: InvItem[] } | InvItem[]>(
        "/api/v1/admin/store-warehouse/warehouse-inventory?limit=200",
      );
      if (Array.isArray(res)) return res;
      return (res as { items?: InvItem[] }).items ?? [];
    },
  });

  const submitMut = useMutation({
    mutationFn: async () => {
      const physical = Number(physicalQty);
      const system = Number(systemQty);
      if (!inventoryId) throw new Error("Select an inventory SKU");
      if (!Number.isFinite(physical) || physical < 0) throw new Error("Physical qty must be ≥ 0");
      await api.put(`/api/v1/admin/store-warehouse/warehouse-inventory/${inventoryId}`, { quantity: physical });
      await api.post("/api/v1/warehouse/inventory/adjustments", {
        sku: sku || "UNKNOWN",
        productName: productName || sku || "Unknown",
        type: "Cycle Count Adj.",
        change: physical - system,
        reason: "Warehouse stock audit adjustment",
        system_qty: system,
        physical_qty: physical,
        inventoryId,
      });
    },
    onSuccess: () => {
      pushToast("Audit adjustment submitted — inventory updated", "success");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["wh-adjustments"] });
      qc.invalidateQueries({ queryKey: ["wh-inventory-audit"] });
      qc.invalidateQueries({ queryKey: ["warehouse-inventory"] });
    },
    onError: (e) => pushToast((e as Error).message || "Audit submit failed", "error"),
  });

  const kpis: KpiStat[] = useMemo(
    () => [
      { value: String(rows.length), label: "Audit adjustments" },
      { value: String(inventory?.length ?? 0), label: "SKUs in warehouse" },
      { value: String(rows.reduce((s, r) => s + Math.abs(r.change), 0)), label: "|Units adjusted|" },
    ],
    [rows, inventory?.length],
  );

  if (isLoading) return <CardSkeleton />;
  if (isError) return <EmptyState title="Couldn't load warehouse audit" action={<Button size="sm" onClick={() => refetch()}>Retry</Button>} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <KpiStrip kpis={kpis} moduleId="wh-audit" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            const first = inventory?.[0];
            setInventoryId(first?._id ?? "");
            setSku(first?.product?.sku ?? "");
            setProductName(first?.product?.name ?? "");
            setSystemQty(String(first?.quantity ?? 0));
            setPhysicalQty(String(first?.quantity ?? 0));
            setOpen(true);
          }}
        >
          Start audit / Adjust stock
        </Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No audit adjustments yet"
          description="Start an audit to record physical vs system variance. Seed data is not shown."
          action={
            <Button size="sm" variant="primary" onClick={() => setOpen(true)}>
              Start audit / Adjust stock
            </Button>
          }
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Audit ID", "SKU", "Product", "Type", "Change", "Reason", "Actor", "When"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{r.id}</td>
                    <td style={{ padding: "8px 10px" }}>{r.sku}</td>
                    <td style={{ padding: "8px 10px" }}>{r.productName}</td>
                    <td style={{ padding: "8px 10px" }}>{r.type}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge label={String(r.change)} tone={r.change === 0 ? "grey" : r.change > 0 ? "green" : "red"} />
                    </td>
                    <td style={{ padding: "8px 10px" }}>{r.reason}</td>
                    <td style={{ padding: "8px 10px" }}>{r.user}</td>
                    <td style={{ padding: "8px 10px" }}>{r.when}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Warehouse stock audit"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" isLoading={submitMut.isPending} onClick={() => submitMut.mutate()}>
              Submit audit
            </Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Inventory row
            <select
              value={inventoryId}
              onChange={(e) => {
                const id = e.target.value;
                setInventoryId(id);
                const row = inventory?.find((i) => i._id === id);
                setSku(row?.product?.sku ?? "");
                setProductName(row?.product?.name ?? "");
                setSystemQty(String(row?.quantity ?? 0));
                setPhysicalQty(String(row?.quantity ?? 0));
              }}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            >
              <option value="">Select SKU…</option>
              {(inventory ?? []).map((i) => (
                <option key={i._id} value={i._id}>
                  {i.product?.sku ?? i._id} — qty {i.quantity}
                </option>
              ))}
            </select>
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            System qty
            <input type="number" value={systemQty} readOnly style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Physical qty
            <input type="number" min={0} value={physicalQty} onChange={(e) => setPhysicalQty(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
          <div style={{ fontSize: 12, color: "var(--mu)" }}>Variance: {Number(physicalQty) - Number(systemQty)}</div>
        </div>
      </Dialog>
    </div>
  );
}
