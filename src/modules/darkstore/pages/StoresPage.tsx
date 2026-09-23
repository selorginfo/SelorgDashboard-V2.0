import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useStores, useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { darkStoreUsersService } from "@/services/darkStoreUsers/darkStoreUsersService";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { KpiStat } from "@/types/common";
import type { DarkStoreCard } from "@/types/darkstore";
import styles from "./StoresPage.module.css";

const TABS = ["All stores", "At risk", "Low stock"];

const SHIFT_LABEL: Record<string, string> = {
  morning: "Morning",
  afternoon: "Afternoon",
  evening: "Evening",
  night: "Night",
  full_day: "Full Day",
};

const ROLE_TONE: Record<string, "blue" | "amber" | "grey"> = {
  manager: "blue",
  picker: "amber",
  delivery_boy: "grey",
};

const ROLE_LABEL: Record<string, string> = {
  manager: "Manager",
  picker: "Picker",
  delivery_boy: "Delivery Boy",
};

export function StoresPage() {
  const [tab, setTab] = useState(TABS[0]);
  const navigate = useNavigate();
  const { data: apiStores = [] } = useStores();
  const { data: records = [] } = useStoreRecords();
  const [selectedId, setSelectedId] = useState<string | undefined>(apiStores[0]?.id);

  // Fetch all staff once — build per-store map in memory
  const { data: allStaffData } = useQuery({
    queryKey: ["darkstore-users-all"],
    queryFn: () => darkStoreUsersService.list(),
    staleTime: 60_000,
  });
  const allStaff = allStaffData?.items ?? [];

  const staffByStore = useMemo(() => {
    const map: Record<string, typeof allStaff> = {};
    for (const s of allStaff) {
      if (!map[s.darkStoreId]) map[s.darkStoreId] = [];
      map[s.darkStoreId].push(s);
    }
    return map;
  }, [allStaff]);

  const stores = useMemo(() => {
    if (tab === "At risk") return apiStores.filter((s) => s.status.tone === "amber" || s.status.tone === "red");
    if (tab === "Low stock") return apiStores.filter((s) => s.inventory.tone === "red" || s.inventory.tone === "amber");
    return apiStores;
  }, [tab, apiStores]);

  const selected: DarkStoreCard | undefined =
    stores.find((s) => s.id === selectedId) ?? stores[0] ?? apiStores.find((s) => s.id === selectedId);
  const selectedRecord = records.find((r) => r._id === selected?.id) || null;
  const selectedStaff = selectedRecord ? (staffByStore[selectedRecord._id] ?? []) : [];

  const manager = selectedStaff.find((s) => s.role === "manager");
  const pickers = selectedStaff.filter((s) => s.role === "picker");
  const deliveryBoys = selectedStaff.filter((s) => s.role === "delivery_boy");

  const kpis: KpiStat[] = useMemo(() => {
    const total = records.length;
    const open = records.filter((r) => r.isActive).length;
    const atRisk = apiStores.filter((s) => s.status.tone === "amber" || s.status.tone === "red").length;
    return [
      { value: String(total), label: "Dark stores" },
      { value: String(open), label: "Open" },
      { value: String(atRisk), label: "At risk", color: atRisk > 0 ? "var(--red-tx)" : undefined },
      { value: String(total - open), label: "Inactive" },
    ];
  }, [records, apiStores]);

  return (
    <div className={styles.wrap}>
      <KpiStrip kpis={kpis} moduleId="stores" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Button size="sm" variant="secondary" onClick={() => navigate("/ds-overview")}>
            Edit store
          </Button>
          <Button size="sm" variant="primary" onClick={() => navigate("/ds-overview")}>
            Add store
          </Button>
        </div>
      </div>

      {stores.length === 0 ? (
        <EmptyState
          title={`No stores in "${tab}"`}
          description={tab !== "All stores" ? "Try All stores, or add a store from Dark Store Network." : undefined}
          action={
            tab !== "All stores" ? (
              <Button size="sm" variant="secondary" onClick={() => setTab("All stores")}>
                Show all stores
              </Button>
            ) : (
              <Button size="sm" variant="primary" onClick={() => navigate("/ds-overview")}>
                Add store
              </Button>
            )
          }
        />
      ) : (
        <div className={styles.storeGrid}>
          {stores.map((s) => {
            const rec = records.find((r) => r._id === s.id);
            const storeStaff = rec ? (staffByStore[rec._id] ?? []) : [];
            const mgr = storeStaff.find((m) => m.role === "manager");
            return (
              <button
                key={s.id}
                type="button"
                className={styles.storeCardBtn}
                data-selected={s.id === selected?.id}
                onClick={() => setSelectedId(s.id)}
              >
                <Card className={styles.storeCard}>
                  <div className={styles.cardTop}>
                    <span className={styles.storeName}>{s.store}</span>
                    <Badge label={s.status.label} tone={s.status.tone} />
                  </div>
                  <div className={styles.cardMeta}>{s.hours}</div>

                  {/* Staff count chip */}
                  <div className={styles.staffChip}>
                    <span className={styles.staffCount}>{storeStaff.length}</span>
                    <span className={styles.staffLabel}>staff{storeStaff.length !== 1 ? "" : ""}</span>
                    {mgr && <span className={styles.mgrName}>· {mgr.name}</span>}
                  </div>

                  <div className={styles.capRow}>
                    <div className={styles.capBar}>
                      <div
                        className={styles.capBarFill}
                        style={{ width: `${s.capacityPct >= 0 ? Math.min(s.capacityPct, 100) : 0}%` }}
                      />
                    </div>
                    <span className={styles.capLabel}>{s.capacityPct >= 0 ? `${s.capacityPct}%` : "—"}</span>
                  </div>

                  <div className={styles.statRow}>
                    <div className={styles.statCell}>
                      <span className={styles.statValue}>{s.activeOrders}</span>
                      <span className={styles.statLabel}>Active orders</span>
                    </div>
                    <div className={styles.statCell}>
                      <span className={styles.statValue}>{storeStaff.filter((m) => m.role === "picker").length}</span>
                      <span className={styles.statLabel}>Pickers</span>
                    </div>
                    <div className={styles.statCell}>
                      <Badge label={s.inventory.label} tone={s.inventory.tone} />
                      <span className={styles.statLabel}>Inventory</span>
                    </div>
                  </div>
                </Card>
              </button>
            );
          })}
        </div>
      )}

      {selected ? (
        <Card className={styles.detailStrip}>
          <div className={styles.detailHeader}>
            <div className={styles.detailTitle}>{selected.store}</div>
            <div className={styles.detailHeaderRight}>
              <span className={styles.totalStaffBadge}>{selectedStaff.length} staff</span>
              <Badge label={selected.status.label} tone={selected.status.tone} />
              <Button size="sm" variant="secondary" onClick={() => navigate("/ds-overview")}>
                Edit store
              </Button>
            </div>
          </div>

          {/* Store info fields */}
          <div className={styles.detailFields}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Manager</span>
              <span className={styles.fieldValue}>{manager ? manager.name : "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Hours</span>
              <span className={styles.fieldValue}>{selected.hours}</span>
            </div>
            {selectedRecord && (
              <>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Service radius</span>
                  <span className={styles.fieldValue}>{selectedRecord.serviceRadius} km</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Location</span>
                  <span className={styles.fieldValue}>
                    {selectedRecord.location.coordinates[1].toFixed(4)},{" "}
                    {selectedRecord.location.coordinates[0].toFixed(4)}
                  </span>
                </div>
              </>
            )}
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Pickers</span>
              <span className={styles.fieldValue}>{pickers.length}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Delivery boys</span>
              <span className={styles.fieldValue}>{deliveryBoys.length}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Total staff</span>
              <span className={styles.fieldValue}>{selectedStaff.length}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Inventory health</span>
              <span className={styles.fieldValue}>
                <Badge label={selected.inventory.label} tone={selected.inventory.tone} />
              </span>
            </div>
          </div>

          {/* Staff list */}
          {selectedStaff.length > 0 && (
            <div className={styles.staffSection}>
              <div className={styles.staffSectionTitle}>Staff Members</div>
              <div className={styles.staffList}>
                {selectedStaff.map((member) => (
                  <div key={member._id} className={styles.staffRow}>
                    <div className={styles.staffInfo}>
                      <span className={styles.staffMemberName}>{member.name}</span>
                      <span className={styles.staffMemberMeta}>{member.email}</span>
                      {member.phone && <span className={styles.staffMemberMeta}>{member.phone}</span>}
                    </div>
                    <div className={styles.staffBadges}>
                      <Badge label={ROLE_LABEL[member.role] ?? member.role} tone={ROLE_TONE[member.role] ?? "grey"} />
                      <span className={styles.shiftTag}>{SHIFT_LABEL[member.shift] ?? member.shift}</span>
                      <Badge label={member.isActive ? "Active" : "Inactive"} tone={member.isActive ? "green" : "grey"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedStaff.length === 0 && (
            <p className={styles.noStaff}>No staff assigned to this store yet.</p>
          )}
        </Card>
      ) : null}
    </div>
  );
}
