import { useMemo, useState } from "react";
import { useRacks, useRackStoreSummaries, useCreateRack, useUpdateRack } from "@/modules/darkstore/hooks/useRacks";
import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { Dialog } from "@/components/ui/Dialog";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { DsRack } from "@/types/darkstore";
import type { KpiStat } from "@/types/common";
import styles from "./RacksPage.module.css";

const CONFIG = DARKSTORE_CONFIGS.racks;
const TABS = CONFIG?.tabs ?? [];
const NEAR_CAPACITY_THRESHOLD = 0.85;

function RackCard({
  rack,
  canManage,
  onRelease,
  onAssign,
  pending,
}: {
  rack: DsRack;
  canManage: boolean;
  onRelease: (rack: DsRack) => void;
  onAssign: (rack: DsRack) => void;
  pending?: boolean;
}) {
  const pct = rack.capacity > 0 ? rack.occupied / rack.capacity : 0;
  const nearCapacity = pct >= NEAR_CAPACITY_THRESHOLD;
  const occupied = rack.occupied > 0;
  return (
    <Card className={styles.rackCard}>
      <div className={styles.cardTop}>
        <span className={styles.rackId}>{rack.id}</span>
        <Badge label={rack.status.label} tone={rack.status.tone} />
      </div>
      <div className={styles.cardMeta}>
        {rack.store} · {rack.zone}
      </div>
      <div className={styles.cardMeta}>{rack.barcode}</div>
      <div className={styles.cardMeta}>
        {rack.occupied}/{rack.capacity} slots · {rack.available} available
      </div>

      <div className={styles.slotGrid}>
        {Array.from({ length: Math.min(rack.capacity, 48) }).map((_, i) => (
          <div
            key={i}
            className={styles.slotCell}
            data-filled={i < rack.occupied}
            data-near-capacity={nearCapacity}
          />
        ))}
      </div>

      {canManage ? (
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          {occupied ? (
            <Button size="sm" variant="secondary" isLoading={pending} onClick={() => onRelease(rack)}>
              Clear / Release
            </Button>
          ) : (
            <Button size="sm" variant="primary" isLoading={pending} onClick={() => onAssign(rack)}>
              Assign
            </Button>
          )}
        </div>
      ) : null}
    </Card>
  );
}

export function RacksPage() {
  const [tab, setTab] = useState(TABS[0] ?? "All racks");
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const createRack = useCreateRack();
  const updateRack = useUpdateRack();
  const [newOpen, setNewOpen] = useState(false);
  const [zone, setZone] = useState("Staging A");
  const [aisle, setAisle] = useState("A1");
  const [locationCode, setLocationCode] = useState("");
  const [shelfNumber, setShelfNumber] = useState("1");
  const [pendingId, setPendingId] = useState<string | undefined>();

  const { data: apiRacks, isError, refetch } = useRacks();
  const { data: apiStoreSummaries } = useRackStoreSummaries();

  const racks = apiRacks ?? [];
  const storeSummaries = apiStoreSummaries ?? [];
  const canManage = can("racks", "create") || can("racks", "edit");

  const nearCapacity = useMemo(
    () => racks.filter((r) => r.capacity > 0 && r.occupied / r.capacity >= NEAR_CAPACITY_THRESHOLD),
    [racks],
  );
  const inactive = useMemo(() => racks.filter((r) => r.status.label === "Inactive"), [racks]);

  const liveKpis = useMemo((): KpiStat[] => {
    const totalCapacity = racks.reduce((s, r) => s + r.capacity, 0);
    const totalOccupied = racks.reduce((s, r) => s + r.occupied, 0);
    return [
      { label: "Racks", value: String(racks.length) },
      { label: "Active", value: String(racks.filter((r) => r.status.label !== "Inactive").length) },
      { label: "Bag slots", value: String(totalCapacity) },
      { label: "Occupied", value: String(totalOccupied) },
      { label: "Available", value: String(totalCapacity - totalOccupied) },
      { label: "Inactive", value: String(inactive.length), color: inactive.length > 0 ? "var(--amber-tx)" : undefined },
    ];
  }, [racks, inactive]);

  function handleCreate() {
    const code = locationCode.trim() || `${aisle.trim()}-${shelfNumber}`;
    if (!zone.trim() || !aisle.trim()) {
      pushToast("Zone and aisle are required", "error");
      return;
    }
    createRack.mutate(
      {
        location_code: code,
        aisle: aisle.trim(),
        shelf_number: Number(shelfNumber) || 1,
        zone: zone.trim(),
        section: "staging",
      },
      {
        onSuccess: (rack) => {
          pushToast(`Staging rack ${rack.id} created`, "success");
          setNewOpen(false);
          setLocationCode("");
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't create rack", "error"),
      },
    );
  }

  function releaseRack(rack: DsRack) {
    setPendingId(rack.id);
    updateRack.mutate(
      { shelfId: rack.id, status: "normal", occupied: 0 },
      {
        onSuccess: () => pushToast(`${rack.id} cleared / released`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't release rack", "error"),
        onSettled: () => setPendingId(undefined),
      },
    );
  }

  function assignRack(rack: DsRack) {
    setPendingId(rack.id);
    const nextOcc = Math.min(rack.capacity, Math.max(1, rack.occupied + 1));
    updateRack.mutate(
      { shelfId: rack.id, status: "critical", occupied: nextOcc },
      {
        onSuccess: () => pushToast(`${rack.id} assigned (occupied ${nextOcc})`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't assign rack", "error"),
        onSettled: () => setPendingId(undefined),
      },
    );
  }

  const renderGrid = (list: DsRack[]) => (
    <div className={styles.grid}>
      {list.map((r) => (
        <RackCard
          key={r.id}
          rack={r}
          canManage={canManage}
          onRelease={releaseRack}
          onAssign={assignRack}
          pending={pendingId === r.id}
        />
      ))}
    </div>
  );

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="racks" flow={CONFIG?.flow} activeIndex={CONFIG?.flowAt} />

      <div className={styles.headerRow}>
        <KpiStrip kpis={liveKpis} moduleId="racks" />
        {can("racks", "create") ? (
          <Button variant="primary" onClick={() => setNewOpen(true)}>
            + New staging rack
          </Button>
        ) : null}
      </div>

      {isError ? (
        <EmptyState
          title="Couldn't load racks"
          action={
            <Button size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      ) : null}

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "By store" ? (
        storeSummaries.length === 0 ? (
          <EmptyState title="No store rack summaries" />
        ) : (
          <div className={styles.grid}>
            {storeSummaries.map((s) => (
              <Card key={s.store} className={styles.rackCard}>
                <div className={styles.cardTop}>
                  <span className={styles.rackId}>{s.store}</span>
                  <Badge label={s.status.label} tone={s.status.tone} />
                </div>
                <div className={styles.cardMeta}>
                  {s.rackCount} · {s.zones}
                </div>
                <div className={styles.cardMeta}>
                  {s.occupied}/{s.capacity} occupied · {s.available} free
                </div>
              </Card>
            ))}
          </div>
        )
      ) : tab === "Near capacity" ? (
        nearCapacity.length === 0 ? <EmptyState title="No racks near capacity" /> : renderGrid(nearCapacity)
      ) : tab === "Inactive" ? (
        inactive.length === 0 ? <EmptyState title="No inactive racks" /> : renderGrid(inactive)
      ) : racks.length === 0 ? (
        <EmptyState title="No racks yet" />
      ) : (
        renderGrid(racks)
      )}

      <Dialog open={newOpen} onOpenChange={setNewOpen} title="New staging rack">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Zone
            <input
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Aisle
            <input
              value={aisle}
              onChange={(e) => setAisle(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Shelf number
            <input
              type="number"
              min={1}
              value={shelfNumber}
              onChange={(e) => setShelfNumber(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Location code (optional)
            <input
              value={locationCode}
              onChange={(e) => setLocationCode(e.target.value)}
              placeholder="Defaults to aisle-shelf"
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <Button variant="primary" size="sm" isLoading={createRack.isPending} onClick={handleCreate}>
            Create rack
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
