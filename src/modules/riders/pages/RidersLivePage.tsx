import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  useRidersLive,
  useRidersDirectory,
  useRidersStats,
  useAssignRiderOrder,
  useUpdateRiderStatus,
  useRaiseRiderIncident,
  useRiderPerformance,
  useRiderEarningsTab,
  useRiderIncidentsTab,
} from "@/modules/riders/hooks/useRidersData";
import { RiderFleetMap } from "@/modules/riders/components/RiderFleetMap";
import { LiveGpsMap } from "@/modules/riders/components/LiveGpsMap";
import { useLiveRiderPositions } from "@/modules/riders/hooks/useLiveRiderPositions";
import { api } from "@/lib/apiClient";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import type { Badge as BadgeType } from "@/types/common";
import styles from "./RidersLivePage.module.css";

const TABS = ["Live deliveries", "Live GPS", "Rider directory", "Performance", "Earnings", "Incidents"];

const RIDER_ACTIONS = ["Assign order", "Reassign order", "Call rider", "Mark on break", "Approve settlement", "Raise incident"];

function SimpleTable({ cols, rows }: { cols: string[]; rows: (string | BadgeType)[][] }) {
  if (!rows.length) {
    return <EmptyState title="No records yet" description="Live data will appear here when the backend has riders for this view." />;
  }
  return (
    <div className={styles.tableScroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>
              {row.map((cell, j) =>
                typeof cell === "string" ? (
                  <td key={j}>{cell}</td>
                ) : (
                  <td key={j}>
                    <Badge label={cell.label} tone={cell.tone} />
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RidersLivePage() {
  const [tab, setTab] = useState(TABS[0] as string);
  const pushToast = useUiStore((s) => s.pushToast);
  const navigate = useNavigate();

  const { data: liveData, isLoading: liveLoading } = useRidersLive();
  const { data: dirData } = useRidersDirectory();
  const { data: stats } = useRidersStats();
  const { data: performanceRows = [] } = useRiderPerformance();
  const { data: earningsRows = [] } = useRiderEarningsTab();
  const { data: incidentRows = [] } = useRiderIncidentsTab();
  const assignOrder = useAssignRiderOrder();
  const updateStatus = useUpdateRiderStatus();
  const raiseIncident = useRaiseRiderIncident();
  const gpsPositions = useLiveRiderPositions();

  // Real API only — never fall back to design seed riders.
  const liveRiders = liveData ?? [];
  const directory = dirData ?? [];

  const [selectedId, setSelectedId] = useState<string | undefined>();
  useEffect(() => {
    if (!selectedId && liveRiders[0]?.id) setSelectedId(liveRiders[0].id);
  }, [liveRiders, selectedId]);
  const selected = liveRiders.find((r) => r.id === selectedId) ?? liveRiders[0];

  function runRiderAction(action: string) {
    if (!selected) return;
    if (action === "Assign order" || action === "Reassign order") {
      const orderId = window.prompt(
        action === "Reassign order" ? "Order ID to reassign" : "Order ID to assign",
        selected.currentOrder !== "—" ? selected.currentOrder : ""
      );
      if (!orderId?.trim()) return;
      assignOrder.mutate(
        { orderId: orderId.trim(), riderId: selected.id },
        {
          onSuccess: () => pushToast(`${action}: ${orderId.trim()} → ${selected.name}`, "success"),
          onError: (e) => pushToast((e as Error).message || `Couldn't ${action.toLowerCase()}`, "error"),
        }
      );
      return;
    }
    if (action === "Call rider") {
      const phone = directory.find((d) => d.name === selected.name)?.phone;
      if (phone && phone !== "—") {
        window.open(`tel:${phone.replace(/\s+/g, "")}`, "_self");
        pushToast(`Calling ${selected.name}`, "info");
      } else {
        pushToast(`No phone number on file for ${selected.name}`, "error");
      }
      return;
    }
    if (action === "Mark on break") {
      updateStatus.mutate(
        { riderId: selected.id, status: "on_break" },
        {
          onSuccess: () => pushToast(`${selected.name} marked on break`, "success"),
          onError: (e) => pushToast((e as Error).message || "Couldn't update rider status", "error"),
        }
      );
      return;
    }
    if (action === "Raise incident") {
      const detail = window.prompt(`Incident note for ${selected.name}`, "") ?? "";
      raiseIncident.mutate(
        { riderId: selected.id, title: `Rider incident — ${selected.name}`, detail: detail.trim() || undefined },
        {
          onSuccess: () => pushToast(`Incident raised for ${selected.name}`, "success"),
          onError: (e) => pushToast((e as Error).message || "Couldn't raise incident", "error"),
        }
      );
      return;
    }
    if (action === "Approve settlement") {
      void (async () => {
        try {
          const payouts = await api.get<
            | Array<{ _id?: string; id?: string; riderId?: string; riderName?: string; status?: string }>
            | { list?: Array<{ _id?: string; id?: string; riderId?: string; riderName?: string; status?: string }>; data?: Array<{ _id?: string; id?: string; riderId?: string; riderName?: string; status?: string }>; items?: Array<{ _id?: string; id?: string; riderId?: string; riderName?: string; status?: string }> }
          >("/api/v1/admin/finance/rider-cash/payouts");
          const rows = Array.isArray(payouts)
            ? payouts
            : ((payouts as { list?: unknown[]; data?: unknown[]; items?: unknown[] }).list ??
              (payouts as { data?: unknown[] }).data ??
              (payouts as { items?: unknown[] }).items ??
              []);
          const match = (rows as Array<{ _id?: string; id?: string; riderId?: string; riderName?: string; status?: string }>).find(
            (p) =>
              p.riderId === selected.id ||
              (p.riderName && p.riderName.toLowerCase() === selected.name.toLowerCase()) ||
              String(p.status ?? "").toLowerCase().includes("pending"),
          );
          if (match?._id || match?.id) {
            const id = String(match._id ?? match.id);
            await api.post(`/api/v1/admin/finance/approvals/${encodeURIComponent(id)}/decision`, {
              decision: "approve",
            });
            pushToast(`Settlement approved for ${selected.name}`, "success");
            return;
          }
          navigate("/rider-earn");
          pushToast(`No pending payout matched — opened Rider Earnings for ${selected.name}`, "info");
        } catch (e) {
          navigate("/rider-earn");
          pushToast((e as Error).message || `Opened Rider Earnings for ${selected.name}`, "info");
        }
      })();
      return;
    }
    pushToast(`${action} is not available for ${selected.name}`, "info");
  }

  return (
    <div className={styles.wrap}>
      <Card className={styles.statsCard}>
        <KpiStrip
          moduleId="riders"
          kpis={[
            { value: stats ? String(stats.online) : "—", label: "Riders online" },
            { value: stats ? String(stats.onDelivery) : "—", label: "On delivery" },
            { value: stats ? String(stats.available) : "—", label: "Available" },
            { value: stats?.delayed != null ? String(stats.delayed) : "—", label: "Delayed", color: "var(--red-tx)" },
            { value: stats ? String(stats.unassignedOrders) : "—", label: "Unassigned orders", color: "var(--amber-tx)" },
            { value: stats?.onTimePercent ?? "—", label: "On-time" },
          ]}
        />
      </Card>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Live deliveries" ? (
        liveLoading ? (
          <Card>
            <EmptyState title="Loading riders…" />
          </Card>
        ) : liveRiders.length === 0 ? (
          <Card>
            <EmptyState
              title="No riders online"
              description="The live fleet is empty. Riders appear here when they come online in the rider app — design seed data is never shown."
            />
          </Card>
        ) : (
          <div className={styles.board}>
            <div className={styles.mapCol}>
              <RiderFleetMap riders={liveRiders} selectedId={selectedId} onSelect={setSelectedId} />
              {selected ? (
                <Card className={styles.detailCard}>
                  <div className={styles.detailName}>{selected.name}</div>
                  <div className={styles.fields}>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Hub</span>
                      <span className={styles.fieldValue}>{selected.hub}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Current order</span>
                      <span className={styles.fieldValue}>{selected.currentOrder}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Zone</span>
                      <span className={styles.fieldValue}>{selected.zone}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>ETA</span>
                      <span className={styles.fieldValue}>{selected.eta}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Vehicle</span>
                      <span className={styles.fieldValue}>{selected.vehicle}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.fieldLabel}>Rating</span>
                      <span className={styles.fieldValue}>★ {selected.rating}</span>
                    </div>
                  </div>
                  <div className={styles.actionsRow}>
                    {RIDER_ACTIONS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={styles.actionBtn}
                        disabled={assignOrder.isPending && (a === "Assign order" || a === "Reassign order")}
                        onClick={() => runRiderAction(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </Card>
              ) : null}
            </div>

            <Card className={styles.queueCard}>
              <div className={styles.queueTitle}>Delivery queue</div>
              <div className={styles.queueList}>
                {liveRiders.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    className={styles.queueRow}
                    data-selected={r.id === selectedId}
                    onClick={() => setSelectedId(r.id)}
                  >
                    <div className={styles.queueTop}>
                      <span className={styles.queueName}>{r.name}</span>
                      <span className={styles.queueRating}>★ {r.rating}</span>
                    </div>
                    {r.currentOrder !== "—" ? <div className={styles.queueOrder}>{r.currentOrder}</div> : null}
                    <div className={styles.queueMeta}>{r.eta}</div>
                    <Badge label={r.status.label} tone={r.status.tone} />
                  </button>
                ))}
              </div>
            </Card>
          </div>
        )
      ) : tab === "Live GPS" ? (
        <Card>
          <div style={{ marginBottom: 8, fontSize: 13, color: "#6b7280" }}>
            {gpsPositions.length === 0
              ? "No riders currently transmitting GPS. Riders push positions every 15–30s while on shift."
              : `${gpsPositions.length} rider${gpsPositions.length === 1 ? "" : "s"} live`}
          </div>
          <LiveGpsMap positions={gpsPositions} onSelect={(id) => pushToast(`Rider ${id}`, "info")} />
        </Card>
      ) : tab === "Rider directory" ? (
        <Card>
          <SimpleTable
            cols={["Rider", "Hub", "Phone", "Zone", "KYC", "Vehicle", "Rating", "Status"]}
            rows={directory.map((r) => [r.name, r.hub, r.phone, r.zone, r.kyc, r.vehicle, r.rating, r.status])}
          />
        </Card>
      ) : tab === "Performance" ? (
        <Card>
          <SimpleTable
            cols={["Rider", "Hub", "Deliveries", "Accept rate", "On-time", "Avg time", "Rating", "Status"]}
            rows={performanceRows}
          />
        </Card>
      ) : tab === "Earnings" ? (
        <Card>
          <SimpleTable
            cols={["Rider", "Hub", "Base", "Incentive", "Deduction", "Net", "Cycle", "Status"]}
            rows={earningsRows}
          />
        </Card>
      ) : (
        <Card>
          <SimpleTable
            cols={["Incident", "Rider", "Type", "Order", "Zone", "Detail", "Age", "Status"]}
            rows={incidentRows}
          />
        </Card>
      )}
    </div>
  );
}
