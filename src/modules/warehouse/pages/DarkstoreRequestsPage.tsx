import { useState } from "react";
import { CheckCircle, XCircle, Package, Truck, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import {
  useWDTransferRequests,
  useAcceptWDTransfer,
  useRejectWDTransfer,
  usePackWDTransfer,
  useDispatchWDTransfer,
  useWDTransferLogs,
} from "@/modules/warehouse/hooks/useWDTransfers";
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
import type { WDTransferRequest, WDTransferItem } from "@/types/warehouse";
import styles from "./DarkstoreRequestsPage.module.css";

// ── Flow step definition ───────────────────────────────────────────────────────

const FLOW_STEPS = [
  { step: 1, label: "Requested", status: "pending", icon: "🛒" },
  { step: 2, label: "Review", status: "pending", icon: "🏭" },
  { step: 3, label: "Accepted", status: "accepted", icon: "✅" },
  { step: 4, label: "Packed", status: "packed", icon: "📦" },
  { step: 5, label: "Dispatched", status: "dispatched", icon: "🚚" },
  { step: 6, label: "Completed", status: "completed", icon: "✔️" },
] as const;

function currentStep(status: WDTransferRequest["status"]): number {
  switch (status) {
    case "pending": return 2;
    case "accepted": return 3;
    case "packed": return 4;
    case "dispatched": return 5;
    case "completed": return 6;
    case "rejected": return 0;
    default: return 1;
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
  "Action needed": ["pending", "accepted", "packed"],
  "In transit": ["dispatched"],
  "Completed": ["completed"],
  "Rejected": ["rejected"],
};

// ── Accept dialog ──────────────────────────────────────────────────────────────

function AcceptDialog({
  request,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  request: WDTransferRequest;
  open: boolean;
  onClose: () => void;
  onConfirm: (items: Array<{ sku: string; approved_qty: number }>) => void;
  loading: boolean;
}) {
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(request.items.map((i) => [i.sku, i.requested_qty])),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`Accept Request — ${request.transfer_id}`}
      description="Review and approve quantities. Modify if needed."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            variant="primary"
            isLoading={loading}
            onClick={() => onConfirm(request.items.map((i) => ({ sku: i.sku, approved_qty: qtys[i.sku] ?? i.requested_qty })))}
          >
            <CheckCircle size={13} /> Confirm Accept
          </Button>
        </>
      }
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>SKU</th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Product</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700 }}>Requested</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700 }}>Approved Qty</th>
          </tr>
        </thead>
        <tbody>
          {request.items.map((item) => (
            <tr key={item.sku} style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{item.sku}</td>
              <td style={{ padding: "6px 8px" }}>{item.product_name || "—"}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--mu)" }}>{item.requested_qty}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                <input
                  type="number"
                  min={0}
                  max={item.requested_qty}
                  value={qtys[item.sku] ?? item.requested_qty}
                  onChange={(e) => setQtys((p) => ({ ...p, [item.sku]: Number(e.target.value) }))}
                  style={{ width: 64, fontSize: 12, padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 4, textAlign: "right" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}

// ── Pack dialog ────────────────────────────────────────────────────────────────

function PackDialog({
  request,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  request: WDTransferRequest;
  open: boolean;
  onClose: () => void;
  onConfirm: (items: Array<{ sku: string; packed_qty: number }>) => void;
  loading: boolean;
}) {
  const [qtys, setQtys] = useState<Record<string, number>>(
    Object.fromEntries(request.items.map((i) => [i.sku, i.approved_qty])),
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`Pack Items — ${request.transfer_id}`}
      description="Enter the packed quantity for each item after physical verification."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            variant="primary"
            isLoading={loading}
            onClick={() => onConfirm(request.items.map((i) => ({ sku: i.sku, packed_qty: qtys[i.sku] ?? i.approved_qty })))}
          >
            <Package size={13} /> Confirm Packed
          </Button>
        </>
      }
    >
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>SKU</th>
            <th style={{ textAlign: "left", padding: "6px 8px", fontWeight: 700 }}>Product</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700 }}>Approved</th>
            <th style={{ textAlign: "right", padding: "6px 8px", fontWeight: 700 }}>Packed Qty</th>
          </tr>
        </thead>
        <tbody>
          {request.items.map((item) => (
            <tr key={item.sku} style={{ borderBottom: "1px solid var(--border-soft)" }}>
              <td style={{ padding: "6px 8px", fontFamily: "var(--font-mono)", fontSize: 11 }}>{item.sku}</td>
              <td style={{ padding: "6px 8px" }}>{item.product_name || "—"}</td>
              <td style={{ padding: "6px 8px", textAlign: "right", color: "var(--mu)" }}>{item.approved_qty}</td>
              <td style={{ padding: "6px 8px", textAlign: "right" }}>
                <input
                  type="number"
                  min={0}
                  max={item.approved_qty}
                  value={qtys[item.sku] ?? item.approved_qty}
                  onChange={(e) => setQtys((p) => ({ ...p, [item.sku]: Number(e.target.value) }))}
                  style={{ width: 64, fontSize: 12, padding: "3px 6px", border: "1px solid var(--border)", borderRadius: 4, textAlign: "right" }}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Dialog>
  );
}

// ── Dispatch dialog ────────────────────────────────────────────────────────────

function DispatchDialog({
  request,
  open,
  onClose,
  onConfirm,
  loading,
}: {
  request: WDTransferRequest;
  open: boolean;
  onClose: () => void;
  onConfirm: (details: { driver_name: string; driver_phone: string; vehicle_no: string }) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({ driver_name: "", driver_phone: "", vehicle_no: "" });

  const field = (label: string, key: keyof typeof form, placeholder: string) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: "var(--mu)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</label>
      <input
        placeholder={placeholder}
        value={form[key]}
        onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
        style={{ fontSize: 13, padding: "7px 10px", border: "1px solid var(--border)", borderRadius: 6 }}
      />
    </div>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={`Dispatch — ${request.transfer_id}`}
      description={`Dispatching to ${request.dark_store_id} — enter driver and vehicle details.`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button size="sm" variant="primary" isLoading={loading} onClick={() => onConfirm(form)}>
            <Truck size={13} /> Confirm Dispatch
          </Button>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {field("Driver Name", "driver_name", "e.g. Ramesh Kumar")}
        {field("Driver Phone", "driver_phone", "e.g. +91 98765 43210")}
        {field("Vehicle No.", "vehicle_no", "e.g. TN 01 AB 1234")}
        <div style={{ background: "var(--soft)", borderRadius: 8, padding: 10, fontSize: 12, color: "var(--mu)" }}>
          <strong>{request.items.length}</strong> SKU(s) · <strong>{request.items.reduce((s, i) => s + i.packed_qty, 0)}</strong> units packed
        </div>
      </div>
    </Dialog>
  );
}

// ── Flow step tracker ──────────────────────────────────────────────────────────

function FlowTracker({ status }: { status: WDTransferRequest["status"] }) {
  const active = currentStep(status);
  const rejected = status === "rejected";

  return (
    <div className={styles.flowTracker}>
      {FLOW_STEPS.map((s, idx) => {
        const done = !rejected && active > s.step;
        const current = !rejected && active === s.step;
        return (
          <div key={s.step} className={styles.flowStep}>
            <div className={`${styles.flowDot} ${done ? styles.done : ""} ${current ? styles.current : ""} ${rejected ? styles.rejected : ""}`}>
              {done ? "✓" : s.step}
            </div>
            <span className={`${styles.flowLabel} ${current ? styles.flowLabelActive : ""}`}>{s.label}</span>
            {idx < FLOW_STEPS.length - 1 && <div className={`${styles.flowLine} ${done ? styles.done : ""}`} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Request row ────────────────────────────────────────────────────────────────

function RequestRow({
  request,
  onAccept,
  onReject,
  onPack,
  onDispatch,
  acceptLoading,
  rejectLoading,
  packLoading,
  dispatchLoading,
}: {
  request: WDTransferRequest;
  onAccept: (r: WDTransferRequest) => void;
  onReject: (r: WDTransferRequest) => void;
  onPack: (r: WDTransferRequest) => void;
  onDispatch: (r: WDTransferRequest) => void;
  acceptLoading: boolean;
  rejectLoading: boolean;
  packLoading: boolean;
  dispatchLoading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [detailTab, setDetailTab] = useState<"items" | "log">("items");
  const { data: logs = [], isLoading: logsLoading } = useWDTransferLogs(request.transfer_id, expanded && detailTab === "log");
  const totalRequested = request.items.reduce((s, i) => s + i.requested_qty, 0);

  return (
    <Card className={styles.requestRow}>
      <div className={styles.rowHeader} onClick={() => setExpanded((v) => !v)}>
        <div className={styles.rowLeft}>
          <span className={styles.transferId}>{request.transfer_id}</span>
          <Badge label={request.status.charAt(0).toUpperCase() + request.status.slice(1)} tone={statusTone(request.status)} />
        </div>
        <div className={styles.rowMeta}>
          <span>{request.dark_store_id}</span>
          <span>·</span>
          <span>{request.items.length} SKU{request.items.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{totalRequested} units requested</span>
          {request.dispatch_date && (
            <>
              <span>·</span>
              <span>Dispatched {new Date(request.dispatch_date).toLocaleDateString()}</span>
            </>
          )}
        </div>
        <div className={styles.rowActions}>
          {request.status === "pending" && (
            <>
              <Button size="sm" variant="primary" isLoading={acceptLoading} onClick={(e) => { e.stopPropagation(); onAccept(request); }}>
                <CheckCircle size={12} /> Accept
              </Button>
              <Button size="sm" variant="ghost" isLoading={rejectLoading} onClick={(e) => { e.stopPropagation(); onReject(request); }}>
                <XCircle size={12} /> Reject
              </Button>
            </>
          )}
          {request.status === "accepted" && (
            <Button size="sm" variant="primary" isLoading={packLoading} onClick={(e) => { e.stopPropagation(); onPack(request); }}>
              <Package size={12} /> Pack Items
            </Button>
          )}
          {request.status === "packed" && (
            <Button size="sm" variant="primary" isLoading={dispatchLoading} onClick={(e) => { e.stopPropagation(); onDispatch(request); }}>
              <Truck size={12} /> Dispatch
            </Button>
          )}
          <button className={styles.expandBtn} onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}>
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      <FlowTracker status={request.status} />

      {expanded && (
        <div className={styles.itemsTable}>
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
                      <td style={{ padding: "6px 8px", textAlign: "right", color: item.received_qty > 0 ? "inherit" : "var(--mu)" }}>{item.received_qty || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {request.driver_name && (
                <div className={styles.driverInfo}>
                  <span>Driver: <strong>{request.driver_name}</strong></span>
                  {request.driver_phone && <span>· {request.driver_phone}</span>}
                  {request.vehicle_no && <span>· Vehicle: <strong>{request.vehicle_no}</strong></span>}
                </div>
              )}
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

export function DarkstoreRequestsPage() {
  const { data: requests = [], isLoading, isError, refetch } = useWDTransferRequests();
  const accept = useAcceptWDTransfer();
  const reject = useRejectWDTransfer();
  const pack = usePackWDTransfer();
  const dispatch = useDispatchWDTransfer();
  const pushToast = useUiStore((s) => s.pushToast);

  const [tab, setTab] = useState("Action needed");
  const [acceptTarget, setAcceptTarget] = useState<WDTransferRequest | null>(null);
  const [packTarget, setPackTarget] = useState<WDTransferRequest | null>(null);
  const [dispatchTarget, setDispatchTarget] = useState<WDTransferRequest | null>(null);

  if (isLoading) return <CardSkeleton />;
  if (isError) return <ErrorState message="Couldn't load requests." onRetry={refetch} />;

  const filtered = requests.filter((r) => (TAB_FILTERS[tab] ?? []).includes(r.status));

  const tabsWithCount = Object.entries(TAB_FILTERS).map(([label, statuses]) => {
    const count = requests.filter((r) => statuses.includes(r.status)).length;
    return count > 0 ? `${label} (${count})` : label;
  });

  const activeTab = tabsWithCount.find((t) => t.startsWith(tab)) ?? tab;

  return (
    <div className={styles.page}>
      {/* Flow overview banner */}
      <Card className={styles.flowBanner}>
        <div className={styles.bannerTitle}>🏭 Warehouse → Dark Store Transfer Flow</div>
        <div className={styles.bannerSteps}>
          <span>1. Dark Store Requests</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.activeStep}>2. Review &amp; Accept</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.activeStep}>3. Pack Items</span>
          <span className={styles.arrow}>→</span>
          <span className={styles.activeStep}>4. Dispatch</span>
          <span className={styles.arrow}>→</span>
          <span>5. Dark Store Receives</span>
          <span className={styles.arrow}>→</span>
          <span>6. Stock Updated</span>
        </div>
      </Card>

      <div className={styles.toolbar}>
        <Tabs
          value={tab}
          onValueChange={setTab}
          tabs={Object.keys(TAB_FILTERS)}
        />
        <Button size="sm" variant="ghost" onClick={() => refetch()}>
          <RefreshCw size={13} /> Refresh
        </Button>
      </div>

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>No requests in this category</div>
        ) : (
          filtered.map((r) => (
            <RequestRow
              key={r.transfer_id}
              request={r}
              onAccept={(req) => setAcceptTarget(req)}
              onReject={(req) =>
                reject.mutate(
                  { id: req.transfer_id },
                  { onSuccess: () => pushToast(`${req.transfer_id} rejected`, "success"), onError: () => pushToast("Failed to reject", "error") },
                )
              }
              onPack={(req) => setPackTarget(req)}
              onDispatch={(req) => setDispatchTarget(req)}
              acceptLoading={accept.isPending}
              rejectLoading={reject.isPending}
              packLoading={pack.isPending}
              dispatchLoading={dispatch.isPending}
            />
          ))
        )}
      </div>

      {acceptTarget && (
        <AcceptDialog
          request={acceptTarget}
          open={!!acceptTarget}
          onClose={() => setAcceptTarget(null)}
          loading={accept.isPending}
          onConfirm={(items) =>
            accept.mutate(
              { id: acceptTarget.transfer_id, items },
              {
                onSuccess: () => { pushToast(`${acceptTarget.transfer_id} accepted`, "success"); setAcceptTarget(null); },
                onError: () => pushToast("Failed to accept", "error"),
              },
            )
          }
        />
      )}

      {packTarget && (
        <PackDialog
          request={packTarget}
          open={!!packTarget}
          onClose={() => setPackTarget(null)}
          loading={pack.isPending}
          onConfirm={(items) =>
            pack.mutate(
              { id: packTarget.transfer_id, items },
              {
                onSuccess: () => { pushToast(`${packTarget.transfer_id} marked as packed`, "success"); setPackTarget(null); },
                onError: () => pushToast("Failed to pack", "error"),
              },
            )
          }
        />
      )}

      {dispatchTarget && (
        <DispatchDialog
          request={dispatchTarget}
          open={!!dispatchTarget}
          onClose={() => setDispatchTarget(null)}
          loading={dispatch.isPending}
          onConfirm={(details) =>
            dispatch.mutate(
              { id: dispatchTarget.transfer_id, details },
              {
                onSuccess: () => { pushToast(`${dispatchTarget.transfer_id} dispatched`, "success"); setDispatchTarget(null); },
                onError: () => pushToast("Failed to dispatch", "error"),
              },
            )
          }
        />
      )}
    </div>
  );
}
