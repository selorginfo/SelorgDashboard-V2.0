import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { darkStoreInventoryService } from "@/services/darkStoreInventory/darkStoreInventoryService";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { useUiStore } from "@/store/uiStore";
import type { KpiStat } from "@/types/common";

type AuditRow = {
  id: string;
  store: string;
  action: string;
  actor: string;
  note: string;
  createdAt: string;
  status: { label: string; tone: "green" | "amber" | "grey" | "red" | "blue" };
};

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "logs"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  if (r.data && typeof r.data === "object" && Array.isArray((r.data as { logs?: unknown }).logs)) {
    return (r.data as { logs: Record<string, unknown>[] }).logs;
  }
  return [];
}

export function DarkStoreAuditPage() {
  const { data: stores = [], isLoading: storesLoading } = useStoreRecords();
  const [storeId, setStoreId] = useState("");
  useEffect(() => {
    if (!storeId && stores[0]?._id) setStoreId(stores[0]._id);
  }, [stores, storeId]);

  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [sku, setSku] = useState("");
  const [systemQty, setSystemQty] = useState("0");
  const [physicalQty, setPhysicalQty] = useState("0");
  const [inventoryId, setInventoryId] = useState("");

  const { data: logs = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["ds-audit-logs", storeId],
    enabled: !!storeId,
    queryFn: async (): Promise<AuditRow[]> => {
      const res = await api.get<unknown>("/api/v1/darkstore/utilities/audit-logs", {
        storeId,
        page: 1,
        limit: 50,
      });
      return extractList(res).map((raw, i) => {
        const id = String(raw.id ?? raw._id ?? raw.audit_id ?? `AUD-${i}`);
        const created = raw.createdAt ? new Date(String(raw.createdAt)) : null;
        return {
          id,
          store: String(raw.store_id ?? raw.storeId ?? storeId),
          action: String(raw.action ?? raw.type ?? "audit"),
          actor: String(raw.performed_by ?? raw.actor ?? raw.user ?? "Admin"),
          note: String(raw.note ?? raw.message ?? "—"),
          createdAt: created && !Number.isNaN(created.getTime())
            ? created.toLocaleString("en-IN")
            : "—",
          status: { label: "Logged", tone: "green" as const },
        };
      });
    },
    staleTime: 30_000,
  });

  const { data: inventory } = useQuery({
    queryKey: ["ds-inventory-all", "audit", storeId],
    queryFn: async () => {
      const scoped = await darkStoreInventoryService.list(storeId || undefined);
      if (scoped.items.length > 0) return scoped;
      const all = await darkStoreInventoryService.list();
      const items = all.items.filter((i) => String(i.storeId) === String(storeId));
      return { items: items.length ? items : all.items, total: items.length ? items.length : all.items.length };
    },
    enabled: !!storeId,
  });

  // Prefer a store that already has inventory rows so audit adjust can run
  useEffect(() => {
    if (!stores.length || inventory === undefined) return;
    if ((inventory.items?.length ?? 0) > 0) return;
    let cancelled = false;
    (async () => {
      const all = await darkStoreInventoryService.list();
      if (cancelled || !all.items.length) return;
      const sid = String(all.items[0].storeId);
      if (sid && sid !== storeId && stores.some((s) => s._id === sid)) {
        setStoreId(sid);
      }
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [stores, inventory, storeId]);

  const submitAdjust = useMutation({
    mutationFn: async () => {
      const physical = Number(physicalQty);
      const system = Number(systemQty);
      if (!Number.isFinite(physical) || physical < 0) throw new Error("Physical qty must be ≥ 0");
      if (!inventoryId) throw new Error("Select an inventory SKU");
      await darkStoreInventoryService.update(inventoryId, { quantity: physical });
      const variance = physical - system;
      await api.post(`/api/v1/darkstore/inventory/adjustments?storeId=${encodeURIComponent(storeId)}`, {
        sku: sku.trim() || "UNKNOWN",
        action: variance > 0 ? "add" : variance < 0 ? "remove" : "correction",
        quantity: Math.abs(variance) || 0,
        reason: "Stock audit adjustment",
        previous_stock: system,
        new_stock: physical,
        system_qty: system,
        physical_qty: physical,
        variance,
      });
    },
    onSuccess: () => {
      pushToast("Audit adjustment submitted — inventory updated", "success");
      setAdjustOpen(false);
      qc.invalidateQueries({ queryKey: ["ds-audit-logs"] });
      qc.invalidateQueries({ queryKey: ["ds-inventory-all"] });
    },
    onError: (e) => pushToast((e as Error).message || "Couldn't submit audit", "error"),
  });

  const kpis: KpiStat[] = useMemo(
    () => [
      { value: String(logs.length), label: "Audit events" },
      { value: String(inventory?.items?.length ?? 0), label: "SKUs in store" },
      { value: storeId ? "1" : "0", label: "Store scoped" },
    ],
    [logs.length, inventory?.items?.length, storeId],
  );

  if (storesLoading) return <CardSkeleton />;
  if (!storeId) return <EmptyState title="No dark stores" description="Create a store in Dark Store Network first." />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <KpiStrip kpis={kpis} moduleId="ds-audit" />

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
          Store
          <select
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            style={{ fontSize: 12, padding: "6px 8px", borderRadius: 6, border: "1px solid var(--border)" }}
          >
            {stores.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          Refresh
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => {
            const first = inventory?.items?.[0];
            setInventoryId(first?._id ?? "");
            setSku(first?.product?.sku ?? "");
            setSystemQty(String(first?.quantity ?? 0));
            setPhysicalQty(String(first?.quantity ?? 0));
            setAdjustOpen(true);
          }}
        >
          Start audit / Adjust stock
        </Button>
      </div>

      {isLoading ? (
        <CardSkeleton />
      ) : isError ? (
        <EmptyState title="Couldn't load audit logs" action={<Button size="sm" onClick={() => refetch()}>Retry</Button>} />
      ) : logs.length === 0 ? (
        <EmptyState
          title="No audit events yet"
          description="Start an audit adjustment to create the first live record. Seed data is not shown."
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Audit ID", "Store", "Action", "Actor", "Note", "When", "Status"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{row.id}</td>
                    <td style={{ padding: "8px 10px" }}>{row.store}</td>
                    <td style={{ padding: "8px 10px" }}>{row.action}</td>
                    <td style={{ padding: "8px 10px" }}>{row.actor}</td>
                    <td style={{ padding: "8px 10px" }}>{row.note}</td>
                    <td style={{ padding: "8px 10px" }}>{row.createdAt}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <Badge label={row.status.label} tone={row.status.tone} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Dialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        title="Stock audit adjustment"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setAdjustOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" isLoading={submitAdjust.isPending} onClick={() => submitAdjust.mutate()}>
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
                const row = inventory?.items?.find((i) => i._id === id);
                setSku(row?.product?.sku ?? "");
                setSystemQty(String(row?.quantity ?? 0));
                setPhysicalQty(String(row?.quantity ?? 0));
              }}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            >
              <option value="">Select SKU…</option>
              {(inventory?.items ?? []).map((i) => (
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
            <input
              type="number"
              min={0}
              value={physicalQty}
              onChange={(e) => setPhysicalQty(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <div style={{ fontSize: 12, color: "var(--mu)" }}>
            Variance: {Number(physicalQty) - Number(systemQty)}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
