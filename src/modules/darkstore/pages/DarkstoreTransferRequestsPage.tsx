import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, CheckCircle, RefreshCw, ChevronDown, ChevronUp, AlertTriangle, XCircle } from "lucide-react";
import {
  useDarkstoreWDRequests,
  useCreateWDTransferRequest,
  useReceiveWDTransfer,
  useDarkstoreWDTransferLogs,
} from "@/modules/darkstore/hooks/useWDTransferRequests";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { wdTransferService } from "@/services/warehouse/wdTransferService";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ActionTimeline } from "@/components/ui/ActionTimeline";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Tabs } from "@/components/ui/Tabs";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import type { Tone } from "@/types/common";
import type { WDTransferRequest } from "@/types/warehouse";
import styles from "./DarkstoreTransferRequestsPage.module.css";

// ── Flow step tracker ──────────────────────────────────────────────────────────

const FLOW_STEPS = [
  { step: 1, label: "Request Sent", statuses: ["pending"] },
  { step: 2, label: "Under Review", statuses: ["pending"] },
  { step: 3, label: "Accepted", statuses: ["accepted"] },
  { step: 4, label: "Packed", statuses: ["packed"] },
  { step: 5, label: "Dispatched", statuses: ["dispatched"] },
  { step: 6, label: "Completed", statuses: ["completed"] },
] as const;

function currentStep(status: WDTransferRequest["status"]): number {
  switch (status) {
    case "pending": return 1;
    case "accepted": return 3;
    case "packed": return 4;
    case "dispatched": return 5;
    case "completed": return 6;
    default: return 0;
  }
}

function statusTone(status: string): Tone {
  switch (status) {
    case "pending": return "blue";
    case "accepted": return "green";
    case "packed": return "blue";
    case "dispatched": return "orange";
    case "completed": return "green";
    case "rejected": return "red";
    default: return "grey";
  }
}

const TAB_FILTERS: Record<string, WDTransferRequest["status"][]> = {
  "Active": ["pending", "accepted", "packed"],
  "Awaiting Receipt": ["dispatched"],
  "Completed": ["completed"],
  "Rejected": ["rejected"],
};

// ── New request form ───────────────────────────────────────────────────────────

interface NewItem {
  sku: string;
  product_name: string;
  requested_qty: number;
}

function NewRequestDialog({
  open,
  onClose,
  onSubmit,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (warehouseId: string, items: NewItem[], notes: string) => void;
  loading: boolean;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<NewItem[]>([{ sku: "", product_name: "", requested_qty: 1 }]);

  function addItem() {
    setItems((p) => [...p, { sku: "", product_name: "", requested_qty: 1 }]);
  }

  function removeItem(idx: number) {
    setItems((p) => p.filter((_, i) => i !== idx));
  }

  function update(idx: number, field: keyof NewItem, value: string | number) {
    setItems((p) => p.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function handleSubmit() {
    onSubmit(warehouseId, items, notes);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title="New Transfer Request"
      description="Select a warehouse and add the products you need. The warehouse will review and approve before packing."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" isLoading={loading} onClick={handleSubmit}>
            <Plus size={13} /> Submit Request
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mu)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Warehouse ID
          </label>
          <input
            placeholder="Enter warehouse ObjectId"
            value={warehouseId}
            onChange={(e) => setWarehouseId(e.target.value)}
            style={{ fontSize: 13, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mu)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Products ({items.length})
            </label>
            <Button size="sm" variant="ghost" onClick={addItem}>
              <Plus size={11} /> Add row
            </Button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                placeholder="SKU"
                style={{ flex: "0 0 110px", fontSize: 12, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, fontFamily: "var(--font-mono)" }}
                value={item.sku}
                onChange={(e) => update(idx, "sku", e.target.value)}
              />
              <input
                placeholder="Product name"
                style={{ flex: 1, fontSize: 12, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6 }}
                value={item.product_name}
                onChange={(e) => update(idx, "product_name", e.target.value)}
              />
              <input
                type="number"
                min={1}
                placeholder="Qty"
                style={{ flex: "0 0 70px", fontSize: 12, padding: "6px 8px", border: "1px solid var(--border)", borderRadius: 6, textAlign: "right" }}
                value={item.requested_qty}
                onChange={(e) => update(idx, "requested_qty", Math.max(1, Number(e.target.value)))}
              />
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--mu)", padding: 2 }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mu)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Notes (optional)
          </label>
          <textarea
            rows={2}
            placeholder="Priority notes, delivery instructions..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ fontSize: 12, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6, resize: "vertical" }}
          />
        </div>
      </div>
    </Dialog>
  );
}

// ── Receive dialog (Step 5) ────────────────────────────────────────────────────

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
      description="Check each item against packed quantities. Modify received qty if there's a mismatch."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            variant="primary"
            isLoading={loading}
            onClick={() => onConfirm(request.items.map((i) => ({ sku: i.sku, received_qty: qtys[i.sku] ?? i.packed_qty })))}
          >
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
          </div>
        )}

        {hasMismatch && (
          <div style={{ background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, padding: "8px 12px", fontSize: 12, display: "flex", gap: 8, alignItems: "center", color: "#92400e" }}>
            <AlertTriangle size={14} />
            Quantity mismatch detected — stock update will use your verified quantities.
          </div>
        )}

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>SKU</th>
              <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Product</th>
              <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700 }}>Packed</th>
              <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700 }}>Received Qty</th>
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
                    <input
                      type="number"
                      min={0}
                      value={received}
                      onChange={(e) => setQtys((p) => ({ ...p, [item.sku]: Number(e.target.value) }))}
                      style={{
                        width: 64,
                        fontSize: 12,
                        padding: "3px 6px",
                        border: `1px solid ${mismatch ? "#f59e0b" : "var(--border)"}`,
                        borderRadius: 4,
                        textAlign: "right",
                        background: mismatch ? "#fef3c7" : "inherit",
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div style={{ background: "var(--soft)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "var(--mu)" }}>
          After confirmation: <strong>Warehouse stock will decrease</strong> and <strong>your store stock will increase</strong> by the verified quantities.
        </div>
      </div>
    </Dialog>
  );
}

// ── Request row ────────────────────────────────────────────────────────────────

function RequestRow({
  request,
  storeId,
  onReceive,
}: {
  request: WDTransferRequest;
  storeId: string;
  onReceive: (r: WDTransferRequest) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<"items" | "log">("items");
  const { data: logs = [], isLoading: logsLoading } = useDarkstoreWDTransferLogs(request.transfer_id, storeId, expanded && detailTab === "log");
  const step = currentStep(request.status);
  const totalUnits = request.items.reduce((s, i) => s + i.requested_qty, 0);

  return (
    <Card className={styles.requestRow}>
      <div className={styles.rowHeader} onClick={() => setExpanded((v) => !v)}>
        <div className={styles.rowLeft}>
          <span className={styles.transferId}>{request.transfer_id}</span>
          <Badge label={request.status.charAt(0).toUpperCase() + request.status.slice(1)} tone={statusTone(request.status)} />
        </div>
        <div className={styles.rowMeta}>
          <span>{request.items.length} SKU{request.items.length !== 1 ? "s" : ""} · {totalUnits} units</span>
          {request.dispatch_date && <span>· Dispatched {new Date(request.dispatch_date).toLocaleDateString()}</span>}
          {request.driver_name && <span>· Driver: {request.driver_name}</span>}
        </div>
        <div className={styles.rowActions}>
          {request.status === "dispatched" && (
            <Button size="sm" variant="primary" onClick={(e) => { e.stopPropagation(); onReceive(request); }}>
              <CheckCircle size={12} /> Receive &amp; Verify
            </Button>
          )}
          <button className={styles.expandBtn} onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <div className={styles.stepTracker}>
        {FLOW_STEPS.map((s, idx) => {
          const done = request.status !== "rejected" && step > s.step;
          const current = request.status !== "rejected" && step === s.step;
          const rejected = request.status === "rejected";
          return (
            <div key={s.step} className={styles.stepItem}>
              <div className={`${styles.stepDot} ${done ? styles.done : ""} ${current ? styles.current : ""} ${rejected && s.step <= 1 ? styles.rejected : ""}`}>
                {done ? "✓" : s.step}
              </div>
              <span className={`${styles.stepLabel} ${current ? styles.stepLabelActive : ""}`}>{s.label}</span>
              {idx < FLOW_STEPS.length - 1 && <div className={`${styles.stepLine} ${done ? styles.done : ""}`} />}
            </div>
          );
        })}
      </div>

      {expanded && (
        <div className={styles.itemsSection}>
          <div className={styles.detailTabs}>
            <button className={`${styles.detailTab} ${detailTab === "items" ? styles.detailTabActive : ""}`} onClick={() => setDetailTab("items")}>Items</button>
            <button className={`${styles.detailTab} ${detailTab === "log" ? styles.detailTabActive : ""}`} onClick={() => setDetailTab("log")}>Activity Log</button>
          </div>

          {detailTab === "items" ? (
            <>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border)" }}>
                    {["SKU", "Product", "Requested", "Approved", "Packed", "Received"].map((h, i) => (
                      <th key={h} style={{ textAlign: i < 2 ? "left" : "right", padding: "6px 8px", fontWeight: 700, color: "var(--mu)", fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {request.items.map((item) => (
                    <tr key={item.sku} style={{ borderBottom: "1px solid var(--border-soft)" }}>
                      <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{item.sku}</td>
                      <td style={{ padding: "6px 8px" }}>{item.product_name || "—"}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right" }}>{item.requested_qty}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: item.approved_qty > 0 ? "inherit" : "var(--mu)" }}>{item.approved_qty || "—"}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: item.packed_qty > 0 ? "inherit" : "var(--mu)" }}>{item.packed_qty || "—"}</td>
                      <td style={{ padding: "6px 8px", textAlign: "right", color: item.received_qty > 0 ? "var(--accent)" : "var(--mu)", fontWeight: item.received_qty > 0 ? 700 : 400 }}>{item.received_qty || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {request.notes && <div className={styles.notes}>Note: {request.notes}</div>}
            </>
          ) : (
            <ActionTimeline logs={logs} isLoading={logsLoading} />
          )}
        </div>
      )}
    </Card>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export function DarkstoreTransferRequestsPage() {
  const { data: stores = [], isLoading: storesLoading } = useStoreRecords();
  const [storeId, setStoreId] = useState("");
  const navigate = useNavigate();
  useEffect(() => {
    if (!storeId && stores[0]?._id) setStoreId(stores[0]._id);
  }, [stores, storeId]);

  const { data: requests = [], isLoading, isError, refetch } = useDarkstoreWDRequests(storeId);
  const createRequest = useCreateWDTransferRequest(storeId);
  const receiveTransfer = useReceiveWDTransfer(storeId);
  const pushToast = useUiStore((s) => s.pushToast);
  const qc = useQueryClient();

  const acceptMut = useMutation({
    mutationFn: (id: string) => wdTransferService.accept(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ds-wd-transfer-requests", storeId] });
      pushToast("Request accepted", "success");
    },
    onError: (e) => pushToast((e as Error).message || "Accept failed", "error"),
  });
  const rejectMut = useMutation({
    mutationFn: (id: string) => wdTransferService.reject(id, "Rejected by admin"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ds-wd-transfer-requests", storeId] });
      pushToast("Request rejected", "success");
    },
    onError: (e) => pushToast((e as Error).message || "Reject failed", "error"),
  });

  const [tab, setTab] = useState("Active");
  const [showNewForm, setShowNewForm] = useState(false);
  const [receiveTarget, setReceiveTarget] = useState<WDTransferRequest | null>(null);

  if (storesLoading || (storeId && isLoading)) return <CardSkeleton />;
  if (!storeId) {
    return <ErrorState message="No dark stores available. Create one in Dark Store Network first." />;
  }
  if (isError) return <ErrorState message="Couldn't load transfer requests." onRetry={refetch} />;

  const filtered = requests.filter((r) => (TAB_FILTERS[tab] ?? []).includes(r.status));
  const awaiting = requests.filter((r) => r.status === "dispatched").length;

  return (
    <div className={styles.page}>
      <Card className={styles.flowBanner}>
        <div className={styles.bannerTitle}>🏬 Dark Store Transfer Requests</div>
        <div className={styles.bannerSteps}>
          <span className={styles.activeStep}>1. Create Request</span>
          <span className={styles.arrow}>→</span>
          <span>2. Warehouse Reviews</span>
          <span className={styles.arrow}>→</span>
          <span>3. Warehouse Packs</span>
          <span className={styles.arrow}>→</span>
          <span>4. Warehouse Dispatches</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.activeStep}>5. Receive &amp; Verify</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.activeStep}>6. Stock Updated ✓</span>
        </div>
        {awaiting > 0 && (
          <div className={styles.awaitingBadge}>
            ⚠️ {awaiting} shipment{awaiting > 1 ? "s" : ""} awaiting receipt
          </div>
        )}
      </Card>

      <div className={styles.toolbar}>
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
        <Tabs value={tab} onValueChange={setTab} tabs={Object.keys(TAB_FILTERS)} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Button size="sm" variant="ghost" onClick={() => refetch()}><RefreshCw size={13} /> Refresh</Button>
          <Button size="sm" variant="secondary" onClick={() => navigate("/wh-approvals")}>
            Warehouse Approvals
          </Button>
          <Button size="sm" variant="primary" onClick={() => setShowNewForm(true)}><Plus size={13} /> New Request</Button>
        </div>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {tab === "Active" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span>No active requests. Create one to get started.</span>
                <Button size="sm" variant="primary" onClick={() => setShowNewForm(true)}><Plus size={13} /> New Request</Button>
              </div>
            ) : (
              `No ${tab.toLowerCase()} requests`
            )}
          </div>
        ) : (
          filtered.map((r) => (
            <div key={r.transfer_id}>
              <RequestRow request={r} storeId={storeId} onReceive={(req) => setReceiveTarget(req)} />
              {r.status === "pending" ? (
                <div style={{ display: "flex", gap: 8, padding: "0 16px 12px" }}>
                  <Button size="sm" variant="primary" isLoading={acceptMut.isPending} onClick={() => acceptMut.mutate(r.transfer_id)}>
                    <CheckCircle size={12} /> Approve
                  </Button>
                  <Button size="sm" variant="secondary" isLoading={rejectMut.isPending} onClick={() => rejectMut.mutate(r.transfer_id)}>
                    <XCircle size={12} /> Reject
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <NewRequestDialog
        open={showNewForm}
        onClose={() => setShowNewForm(false)}
        loading={createRequest.isPending}
        onSubmit={(warehouseId, items, notes) => {
          if (!warehouseId.trim()) { pushToast("Warehouse ID is required", "error"); return; }
          const validItems = items.filter((i) => i.sku.trim());
          if (validItems.length === 0) { pushToast("Add at least one item with a SKU", "error"); return; }
          createRequest.mutate(
            { warehouse_id: warehouseId, items: validItems, notes: notes || undefined },
            {
              onSuccess: () => { pushToast("Transfer request submitted to warehouse", "success"); setShowNewForm(false); },
              onError: () => pushToast("Failed to create request", "error"),
            },
          );
        }}
      />

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
                  pushToast(`${receiveTarget.transfer_id} received — warehouse stock decreased, store stock increased`, "success");
                  setReceiveTarget(null);
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
