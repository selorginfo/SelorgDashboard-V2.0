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

type XferRow = {
  id: string;
  origin: string;
  destination: string;
  items: number;
  status: string;
  requestedAt: string;
};

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "transfers"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function tone(status: string): "green" | "amber" | "grey" | "red" | "blue" {
  const s = status.toLowerCase();
  if (s === "completed") return "green";
  if (s === "pending") return "amber";
  if (s === "en-route" || s === "loading") return "blue";
  if (s === "cancelled") return "red";
  return "grey";
}

export function WarehouseTransfersPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState("");
  const [origin, setOrigin] = useState("Current Warehouse");
  const [items, setItems] = useState("1");

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["wh-inter-transfers"],
    queryFn: async (): Promise<XferRow[]> => {
      const res = await api.get<unknown>("/api/v1/warehouse/transfers");
      return extractList(res).map((raw, i) => {
        const ts = raw.requestedAt ?? raw.createdAt;
        const d = ts ? new Date(String(ts)) : null;
        return {
          id: String(raw.id ?? raw._id ?? `IWT-${i}`),
          origin: String(raw.origin ?? "—"),
          destination: String(raw.destination ?? "—"),
          items: Number(raw.items ?? 0),
          status: String(raw.status ?? "pending"),
          requestedAt: d && !Number.isNaN(d.getTime()) ? d.toLocaleString("en-IN") : "—",
        };
      });
    },
    staleTime: 20_000,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const n = Number(items);
      if (!destination.trim()) throw new Error("Destination warehouse is required");
      if (!Number.isFinite(n) || n < 1) throw new Error("Items must be ≥ 1");
      if (destination.trim().toLowerCase() === origin.trim().toLowerCase()) {
        throw new Error("Source and destination must differ");
      }
      return api.post("/api/v1/warehouse/transfers", {
        origin: origin.trim() || "Current Warehouse",
        destination: destination.trim(),
        items: n,
      });
    },
    onSuccess: () => {
      pushToast("Warehouse transfer requested", "success");
      setOpen(false);
      setDestination("");
      setItems("1");
      qc.invalidateQueries({ queryKey: ["wh-inter-transfers"] });
    },
    onError: (e) => pushToast((e as Error).message || "Create failed", "error"),
  });

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/v1/warehouse/transfers/${id}/status`, { status }),
    onSuccess: () => {
      pushToast("Transfer status updated", "success");
      qc.invalidateQueries({ queryKey: ["wh-inter-transfers"] });
    },
    onError: (e) => pushToast((e as Error).message || "Status update failed", "error"),
  });

  const kpis: KpiStat[] = useMemo(
    () => [
      { value: String(rows.length), label: "Transfers" },
      { value: String(rows.filter((r) => r.status === "pending").length), label: "Pending" },
      { value: String(rows.filter((r) => r.status === "en-route" || r.status === "loading").length), label: "In transit" },
    ],
    [rows],
  );

  if (isLoading) return <CardSkeleton />;
  if (isError) return <EmptyState title="Couldn't load warehouse transfers" action={<Button size="sm" onClick={() => refetch()}>Retry</Button>} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <KpiStrip kpis={kpis} moduleId="wh-transfer" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
        <Button size="sm" variant="primary" onClick={() => setOpen(true)}>Create transfer</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No warehouse transfers"
          description="Create a warehouse-to-warehouse transfer. Seed data is not shown."
          action={<Button size="sm" variant="primary" onClick={() => setOpen(true)}>Create transfer</Button>}
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Transfer", "Origin", "Destination", "Items", "Status", "Requested", "Actions"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{r.id}</td>
                    <td style={{ padding: "8px 10px" }}>{r.origin}</td>
                    <td style={{ padding: "8px 10px" }}>{r.destination}</td>
                    <td style={{ padding: "8px 10px" }}>{r.items}</td>
                    <td style={{ padding: "8px 10px" }}><Badge label={r.status} tone={tone(r.status)} /></td>
                    <td style={{ padding: "8px 10px" }}>{r.requestedAt}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {r.status === "pending" || r.status === "loading" ? (
                          <Button size="sm" variant="primary" isLoading={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: "en-route" })}>
                            Dispatch
                          </Button>
                        ) : null}
                        {r.status === "en-route" ? (
                          <Button size="sm" variant="secondary" isLoading={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: "completed" })}>
                            Receive
                          </Button>
                        ) : null}
                        {r.status === "pending" ? (
                          <Button size="sm" variant="ghost" isLoading={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: "cancelled" })}>
                            Cancel
                          </Button>
                        ) : null}
                      </div>
                    </td>
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
        title="Create warehouse transfer"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" isLoading={createMut.isPending} onClick={() => createMut.mutate()}>Submit</Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Origin
            <input value={origin} onChange={(e) => setOrigin(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Destination warehouse
            <input value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. WH-02 Adyar" style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Items (units)
            <input type="number" min={1} value={items} onChange={(e) => setItems(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
