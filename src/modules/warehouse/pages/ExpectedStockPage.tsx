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

type AsnRow = {
  id: string;
  poNumber: string;
  vendor: string;
  expectedQty: number;
  status: string;
  expectedDate: string;
};

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "asns"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

export function ExpectedStockPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [poNumber, setPoNumber] = useState("");
  const [vendor, setVendor] = useState("");
  const [qty, setQty] = useState("1");

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["wh-asns"],
    queryFn: async (): Promise<AsnRow[]> => {
      const res = await api.get<unknown>("/api/v1/warehouse/inbound/asns", { status: "all" });
      return extractList(res).map((raw, i) => {
        const ts = raw.expected_date ?? raw.timestamp ?? raw.createdAt;
        const d = ts ? new Date(String(ts)) : null;
        return {
          id: String(raw.asn_id ?? raw.id ?? `ASN-${i}`),
          poNumber: String(raw.poNumber ?? raw.po ?? "—"),
          vendor: String(raw.vendor ?? raw.supplier ?? "—"),
          expectedQty: Number(raw.expected_qty ?? raw.items ?? 0),
          status: String(raw.status ?? "expected"),
          expectedDate: d && !Number.isNaN(d.getTime()) ? d.toLocaleString("en-IN") : "—",
        };
      });
    },
    staleTime: 20_000,
  });

  const createMut = useMutation({
    mutationFn: async () => {
      const expected_qty = Number(qty);
      if (!poNumber.trim()) throw new Error("PO number is required");
      if (!vendor.trim()) throw new Error("Vendor is required");
      if (!Number.isFinite(expected_qty) || expected_qty < 0) throw new Error("Expected qty must be ≥ 0");
      return api.post("/api/v1/warehouse/inbound/asns", {
        poNumber: poNumber.trim(),
        vendor: vendor.trim(),
        expected_qty,
        items: expected_qty,
      });
    },
    onSuccess: () => {
      pushToast("Expected stock (ASN) created", "success");
      setOpen(false);
      setPoNumber("");
      setVendor("");
      setQty("1");
      qc.invalidateQueries({ queryKey: ["wh-asns"] });
    },
    onError: (e) => pushToast((e as Error).message || "Couldn't create ASN", "error"),
  });

  const kpis: KpiStat[] = useMemo(
    () => [
      { value: String(rows.length), label: "Expected records" },
      { value: String(rows.filter((r) => r.status === "expected" || r.status === "pending").length), label: "Pending arrival" },
      { value: String(rows.reduce((s, r) => s + r.expectedQty, 0)), label: "Units expected" },
    ],
    [rows],
  );

  if (isLoading) return <CardSkeleton />;
  if (isError) return <EmptyState title="Couldn't load expected stock" action={<Button size="sm" onClick={() => refetch()}>Retry</Button>} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <KpiStrip kpis={kpis} moduleId="inbound-asn" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
        <Button size="sm" variant="primary" onClick={() => setOpen(true)}>Create expected stock</Button>
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No expected stock yet"
          description="Create an ASN for an upcoming vendor delivery. Seed data is not shown."
          action={<Button size="sm" variant="primary" onClick={() => setOpen(true)}>Create expected stock</Button>}
        />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["ASN", "PO", "Vendor", "Expected qty", "Status", "When"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{r.id}</td>
                    <td style={{ padding: "8px 10px" }}>{r.poNumber}</td>
                    <td style={{ padding: "8px 10px" }}>{r.vendor}</td>
                    <td style={{ padding: "8px 10px" }}>{r.expectedQty}</td>
                    <td style={{ padding: "8px 10px" }}><Badge label={r.status} tone={r.status === "expected" || r.status === "pending" ? "amber" : "green"} /></td>
                    <td style={{ padding: "8px 10px" }}>{r.expectedDate}</td>
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
        title="Create expected stock"
        footer={
          <>
            <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" variant="primary" isLoading={createMut.isPending} onClick={() => createMut.mutate()}>Save</Button>
          </>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            PO number
            <input value={poNumber} onChange={(e) => setPoNumber(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Vendor
            <input value={vendor} onChange={(e) => setVendor(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Expected qty
            <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }} />
          </label>
        </div>
      </Dialog>
    </div>
  );
}
