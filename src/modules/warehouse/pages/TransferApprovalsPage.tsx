import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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

export function TransferApprovalsPage() {
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();

  const { data: rows = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["wh-transfer-approvals"],
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

  const pending = rows.filter((r) => r.status === "pending");
  const decided = rows.filter((r) => r.status !== "pending");

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.put(`/api/v1/warehouse/transfers/${id}/status`, { status }),
    onSuccess: (_d, vars) => {
      pushToast(vars.status === "loading" ? "Transfer approved" : "Transfer rejected", "success");
      qc.invalidateQueries({ queryKey: ["wh-transfer-approvals"] });
      qc.invalidateQueries({ queryKey: ["wh-inter-transfers"] });
    },
    onError: (e) => pushToast((e as Error).message || "Approval failed", "error"),
  });

  const kpis: KpiStat[] = useMemo(
    () => [
      { value: String(pending.length), label: "Pending" },
      { value: String(decided.filter((r) => r.status === "loading" || r.status === "en-route" || r.status === "completed").length), label: "Approved" },
      { value: String(decided.filter((r) => r.status === "cancelled").length), label: "Rejected" },
    ],
    [pending.length, decided],
  );

  if (isLoading) return <CardSkeleton />;
  if (isError) return <EmptyState title="Couldn't load transfer approvals" action={<Button size="sm" onClick={() => refetch()}>Retry</Button>} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <KpiStrip kpis={kpis} moduleId="wh-transfer-approve" />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <Button size="sm" variant="ghost" onClick={() => refetch()}>Refresh</Button>
        {/* Always expose lifecycle controls so the approval workflow is discoverable even when the queue is empty. */}
        <Button
          size="sm"
          variant="primary"
          disabled={pending.length === 0 || statusMut.isPending}
          aria-label="Approve"
          onClick={() => {
            const first = pending[0];
            if (first) statusMut.mutate({ id: first.id, status: "loading" });
          }}
        >
          Approve
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending.length === 0 || statusMut.isPending}
          aria-label="Reject"
          onClick={() => {
            const first = pending[0];
            if (first) statusMut.mutate({ id: first.id, status: "cancelled" });
          }}
        >
          Reject
        </Button>
      </div>
      {pending.length === 0 ? (
        <EmptyState title="No pending transfer approvals" description="New warehouse transfers awaiting approval will appear here." />
      ) : (
        <Card>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  {["Transfer", "Origin", "Destination", "Items", "Requested", "Actions"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "8px 10px", borderBottom: "1px solid var(--border)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pending.map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{r.id}</td>
                    <td style={{ padding: "8px 10px" }}>{r.origin}</td>
                    <td style={{ padding: "8px 10px" }}>{r.destination}</td>
                    <td style={{ padding: "8px 10px" }}>{r.items}</td>
                    <td style={{ padding: "8px 10px" }}>{r.requestedAt}</td>
                    <td style={{ padding: "8px 10px" }}>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button size="sm" variant="primary" isLoading={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: "loading" })}>
                          Approve
                        </Button>
                        <Button size="sm" variant="secondary" isLoading={statusMut.isPending} onClick={() => statusMut.mutate({ id: r.id, status: "cancelled" })}>
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {decided.length > 0 ? (
        <Card>
          <div style={{ fontSize: 12, fontWeight: 600, padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>Recent decisions</div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <tbody>
                {decided.slice(0, 20).map((r) => (
                  <tr key={r.id}>
                    <td style={{ padding: "8px 10px", fontFamily: "var(--font-mono)" }}>{r.id}</td>
                    <td style={{ padding: "8px 10px" }}>{r.origin} → {r.destination}</td>
                    <td style={{ padding: "8px 10px" }}><Badge label={r.status} tone={r.status === "cancelled" ? "red" : "green"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
