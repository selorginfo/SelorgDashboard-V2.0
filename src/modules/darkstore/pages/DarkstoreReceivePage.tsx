/**
 * Step 5 — Dark Store: Receive & Verify dispatched shipments.
 * Focused view showing only dispatched transfers ready for receipt.
 */
import { useEffect, useState } from "react";
import { CheckCircle, RefreshCw, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useDarkstoreWDRequests, useReceiveWDTransfer, useDarkstoreWDTransferLogs } from "@/modules/darkstore/hooks/useWDTransferRequests";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { ActionTimeline } from "@/components/ui/ActionTimeline";
import { useUiStore } from "@/store/uiStore";
import type { WDTransferRequest } from "@/types/warehouse";

function ReceiveDialog({
  request,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  request: WDTransferRequest;
  open: boolean;
  onClose: () => void;
  onConfirm: (items: Array<{ sku: string; received_qty: number }>) => void;
  loading: boolean;
}) {
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(request.items.map((i) => [i.sku, i.packed_qty])),
  );
  const hasMismatch = request.items.some((i) => (qtys[i.sku] ?? i.packed_qty) !== i.packed_qty);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`Receive & Verify — ${request.transfer_id}`}
      description="Check each item against packed quantities. Edit received qty if there's a shortfall or damage."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" isLoading={loading}
            onClick={() => onConfirm(request.items.map((i) => ({ sku: i.sku, received_qty: qtys[i.sku] ?? i.packed_qty })))}>
            <CheckCircle size={13} /> Confirm Receipt &amp; Update Stock
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {request.driver_name && (
          <div style={{ background: "var(--soft)", borderRadius: 8, padding: "8px 12px", fontSize: 12, display: "flex", gap: 12, flexWrap: "wrap" }}>
            {request.driver_name && <span>Driver: <strong>{request.driver_name}</strong></span>}
            {request.driver_phone && <span>{request.driver_phone}</span>}
            {request.vehicle_no && <span>Vehicle: <strong>{request.vehicle_no}</strong></span>}
            {request.dispatch_date && <span>Dispatched: {new Date(request.dispatch_date).toLocaleString()}</span>}
          </div>
        )}
        {hasMismatch && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "8px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "center", color: "#92400e" }}>
            <AlertTriangle size={14} /> Quantity mismatch — stock will update using your verified quantities.
          </div>
        )}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["SKU", "Product", "Packed", "Received Qty"].map((h, i) => (
                <th key={h} style={{ textAlign: i < 2 ? "left" : "right", padding: "6px 8px", fontWeight: 700 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => {
              const received = qtys[item.sku] ?? item.packed_qty;
              const mismatch = received !== item.packed_qty;
              return (
                <tr key={item.sku} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{item.sku}</td>
                  <td style={{ padding: "6px 8px" }}>{item.product_name || "—"}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--mu)" }}>{item.packed_qty}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    <input type="number" min={0} value={received}
                      onChange={(e) => setQtys((p) => ({ ...p, [item.sku]: Number(e.target.value) }))}
                      style={{ width: 64, fontSize: 12, padding: "3px 6px", border: `1px solid ${mismatch ? "#f59e0b" : "var(--border)"}`, borderRadius: 4, textAlign: "right", background: mismatch ? "#fef3c7" : "inherit" }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ background: "var(--soft)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--mu)" }}>
          ✅ After confirmation: <strong>Warehouse stock decreases</strong> and <strong>your store stock increases</strong>.
        </div>
      </div>
    </Dialog>
  );
}

function ShipmentCard({ request, storeId, onReceive }: { request: WDTransferRequest; storeId: string; onReceive: (r: WDTransferRequest) => void }) {
  const [showLog, setShowLog] = useState(false);
  const { data: logs = [], isLoading: logsLoading } = useDarkstoreWDTransferLogs(request.transfer_id, storeId, showLog);
  const totalPacked = request.items.reduce((s, i) => s + i.packed_qty, 0);

  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 800, fontFamily: "var(--font-mono)" }}>{request.transfer_id}</span>
            <Badge label="Dispatched" tone="orange" />
          </div>
          <div style={{ fontSize: 12, color: "var(--mu)", display: "flex", gap: 10, flexWrap: "wrap" }}>
            <span>{request.items.length} SKU(s) · {totalPacked} units packed</span>
            {request.dispatch_date && <span>Dispatched {new Date(request.dispatch_date).toLocaleDateString()}</span>}
            {request.driver_name && <span>Driver: {request.driver_name}</span>}
            {request.vehicle_no && <span>Vehicle: {request.vehicle_no}</span>}
          </div>
        </div>
        <Button size="sm" variant="primary" onClick={() => onReceive(request)}>
          <CheckCircle size={12} /> Receive &amp; Verify
        </Button>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", padding: "8px 16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr>
              {["SKU", "Product", "Requested", "Approved", "Packed"].map((h, i) => (
                <th key={h} style={{ textAlign: i < 2 ? "left" : "right", padding: "5px 8px", fontWeight: 700, color: "var(--mu)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {request.items.map((item) => (
              <tr key={item.sku} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                <td style={{ padding: "5px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{item.sku}</td>
                <td style={{ padding: "5px 8px" }}>{item.product_name || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: "var(--mu)" }}>{item.requested_qty}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", color: "var(--mu)" }}>{item.approved_qty || "—"}</td>
                <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700 }}>{item.packed_qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", padding: "8px 16px" }}>
        <button
          onClick={() => setShowLog((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700, color: "var(--mu)", display: "flex", alignItems: "center", gap: 4 }}
        >
          {showLog ? <ChevronUp size={13} /> : <ChevronDown size={13} />} Activity Log
        </button>
        {showLog && <div style={{ marginTop: 10 }}><ActionTimeline logs={logs} isLoading={logsLoading} /></div>}
      </div>
    </Card>
  );
}

export function DarkstoreReceivePage() {
  const { data: stores = [], isLoading: storesLoading } = useStoreRecords();
  const [storeId, setStoreId] = useState("");
  useEffect(() => {
    if (!storeId && stores[0]?._id) setStoreId(stores[0]._id);
  }, [stores, storeId]);

  const { data: requests = [], isLoading, isError, refetch } = useDarkstoreWDRequests(storeId, "dispatched");
  const receiveTransfer = useReceiveWDTransfer(storeId);
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();
  const [receiveTarget, setReceiveTarget] = useState<WDTransferRequest | null>(null);

  if (storesLoading || (storeId && isLoading)) return <CardSkeleton />;
  if (!storeId) return <ErrorState message="No dark stores available. Create one in Dark Store Network first." />;
  if (isError) return <ErrorState message="Couldn't load dispatched shipments." onRetry={refetch} />;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Card style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ fontSize: 13, fontWeight: 800 }}>🏬 Step 5 — Receive &amp; Verify Inbound Stock</div>
        <div style={{ fontSize: 12, color: "var(--mu)" }}>
          Verify each item&apos;s quantity against what was packed. After confirmation, warehouse stock decreases and your store stock increases automatically.
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
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
        <span style={{ fontSize: 13, fontWeight: 700 }}>
          {requests.length} shipment{requests.length !== 1 ? "s" : ""} awaiting receipt
        </span>
        <Button size="sm" variant="ghost" onClick={() => refetch()}><RefreshCw size={13} /> Refresh</Button>
      </div>

      {requests.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", fontSize: 13, color: "var(--mu)" }}>
          No dispatched shipments awaiting receipt
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {requests.map((r) => (
            <ShipmentCard key={r.transfer_id} request={r} storeId={storeId} onReceive={(req) => setReceiveTarget(req)} />
          ))}
        </div>
      )}

      {receiveTarget && (
        <ReceiveDialog
          request={receiveTarget}
          open={!!receiveTarget}
          onClose={() => setReceiveTarget(null)}
          loading={receiveTransfer.isPending}
          onConfirm={(items) =>
            receiveTransfer.mutate(
              { id: receiveTarget.transfer_id, items },
              {
                onSuccess: () => {
                  pushToast(`${receiveTarget.transfer_id} received — stock updated`, "success");
                  setReceiveTarget(null);
                  qc.invalidateQueries({ queryKey: ["ds-inventory-all"] });
                },
                onError: () => pushToast("Failed to confirm receipt", "error"),
              },
            )
          }
        />
      )}
    </div>
  );
}
