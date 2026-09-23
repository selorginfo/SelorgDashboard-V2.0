import { useEffect, useState } from "react";
import { usePutawayTasks, useConfirmPutaway, useRaiseMismatch } from "@/modules/warehouse/hooks/usePutaway";
import { useWarehouseZones } from "@/modules/warehouse/hooks/useWarehouseHierarchy";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { WorkspaceRow } from "@/types/common";
import styles from "./PutawayAssignPage.module.css";

const PUTAWAY_COLUMNS = ["Task", "GRN", "SKU", "Quantity", "Batch", "Suggested", "Assigned", "Status"];

export function PutawayAssignPage() {
  const { data: zones = [] } = useWarehouseZones();
  const { data: tasks, isLoading, isError, refetch } = usePutawayTasks();
  const confirm = useConfirmPutaway();
  const raiseMismatch = useRaiseMismatch();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [pickedLocation, setPickedLocation] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");

  const queue = (tasks ?? []).filter((t) => t.status.label !== "Confirmed");

  useEffect(() => {
    if (!selectedId && queue.length > 0) setSelectedId(queue[0]!.id);
  }, [queue, selectedId]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !tasks) return <ErrorState message="Couldn't load the putaway queue." onRetry={() => refetch()} />;

  const selected = queue.find((t) => t.id === selectedId);
  const canConfirm = can("putaway", "approve");

  function selectTask(id: string) {
    setSelectedId(id);
    setPickedLocation(undefined);
  }

  function handleConfirm() {
    if (!selected || !pickedLocation) return;
    confirm.mutate(
      { id: selected.id, assigned: pickedLocation },
      {
        onSuccess: () => {
          pushToast(`${selected.id} confirmed at ${pickedLocation}`, "success");
          setSelectedId(undefined);
          setPickedLocation(undefined);
        },
      }
    );
  }

  function handleRaiseMismatch() {
    if (!selected || !pickedLocation) return;
    raiseMismatch.mutate(
      { id: selected.id, assigned: pickedLocation },
      { onSuccess: () => pushToast(`Mismatch raised for ${selected.id}`, "warning") }
    );
  }

  const locationMatches = pickedLocation === undefined || pickedLocation === selected?.suggested;

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="putaway" />

      <div className={styles.headerRow}>
        <ViewToggle view={view} onChange={setView} />
      </div>

      {view === "list" ? (
        <RecordsListTable
          columns={PUTAWAY_COLUMNS}
          rows={queue.map(
            (t): WorkspaceRow => [t.id, t.grn, t.sku, t.quantity, t.batch, t.suggested, t.assigned || "—", t.status]
          )}
          onRowClick={(i) => {
            selectTask(queue[i]!.id);
            setView("workspace");
          }}
        />
      ) : (
      <div className={styles.board}>
        <Card className={styles.queueCard}>
          <div className={styles.queueTitle}>Putaway queue</div>
          <div className={styles.queueList}>
            {queue.length === 0 ? <p className={styles.emptyQueue}>Queue is clear.</p> : null}
            {queue.map((task) => (
              <button
                key={task.id}
                type="button"
                className={styles.queueRow}
                data-selected={task.id === selectedId}
                onClick={() => selectTask(task.id)}
              >
                <div className={styles.queueTop}>
                  <span className={styles.queueRef}>{task.id}</span>
                  <Badge label={task.status.label} tone={task.status.tone} />
                </div>
                <div className={styles.queueMeta}>
                  {task.sku} · {task.quantity} units
                </div>
                <div className={styles.queueMeta}>Suggested {task.suggested}</div>
              </button>
            ))}
          </div>
        </Card>

        {selected ? (
          <div className={styles.mainCol}>
            <Card className={styles.detailCard}>
              <div className={styles.detailHeader}>
                <div className={styles.detailTitle}>{selected.id}</div>
                <Badge label={selected.status.label} tone={selected.status.tone} />
              </div>

              <div className={styles.fields}>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>SKU</span>
                  <span className={styles.fieldValue}>{selected.sku}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Source GRN</span>
                  <span className={styles.fieldValue}>{selected.grn}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Quantity</span>
                  <span className={styles.fieldValue}>{selected.quantity}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Batch</span>
                  <span className={styles.fieldValue}>{selected.batch}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Assigned</span>
                  <span className={styles.fieldValue}>{selected.assigned || "—"}</span>
                </div>
                <div className={styles.field}>
                  <span className={styles.fieldLabel}>Status</span>
                  <span className={styles.fieldValue}>{selected.status.label}</span>
                </div>
              </div>
            </Card>

            <Card className={styles.chosenCard}>
              <div className={styles.chosenLabel}>Suggested by system</div>
              <div className={styles.chosenSuggested}>{selected.suggested}</div>
              <div className={styles.chosenDivider} />
              <div className={styles.chosenLabel}>Selected location</div>
              <div className={styles.chosenValue}>{pickedLocation ?? selected.suggested}</div>
              <p className={styles.matchNote} data-matches={locationMatches}>
                {locationMatches
                  ? "Matches the system suggestion"
                  : "Manual override — a reason is required on confirm"}
              </p>

              {canConfirm ? (
                <div className={styles.actionsRow}>
                  <button type="button" className={styles.actionBtn} onClick={() => setPickedLocation(selected.suggested)}>
                    Suggest location
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    onClick={() =>
                      pushToast("Pick a rack in the location picker below", "info")
                    }
                  >
                    Assign location
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    data-primary="true"
                    disabled={!pickedLocation || confirm.isPending}
                    onClick={handleConfirm}
                  >
                    Confirm putaway
                  </button>
                  <button
                    type="button"
                    className={styles.actionBtn}
                    data-danger="true"
                    disabled={!pickedLocation || raiseMismatch.isPending}
                    onClick={handleRaiseMismatch}
                  >
                    Raise mismatch
                  </button>
                </div>
              ) : null}
            </Card>

            {canConfirm ? (
              <Card className={styles.pickerCard}>
                <div className={styles.pickerTitle}>Pick a warehouse location</div>
                <div className={styles.pickerSub}>Warehouse → Zone → Rack → Bin</div>
                <div className={styles.zonePicker}>
                  {zones.map((zone) => (
                    <div key={zone.zone} className={styles.zoneGroup}>
                      <div className={styles.zoneGroupLabel}>
                        {zone.zone}
                        <span className={styles.zoneGroupDesc}> · {zone.desc}</span>
                      </div>
                      <div className={styles.rackChips}>
                        {zone.racks.map((rack) => {
                          const location = `${zone.zone} · ${rack.id}`;
                          const free = rack.bins - rack.used;
                          return (
                            <button
                              key={rack.id}
                              type="button"
                              className={styles.rackChip}
                              data-selected={location === pickedLocation}
                              data-full={free <= 0}
                              disabled={free <= 0}
                              onClick={() => setPickedLocation(location)}
                            >
                              {rack.id}
                              <span className={styles.rackFree}>{free > 0 ? `${free} free` : "Full"}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ) : null}
          </div>
        ) : (
          <EmptyState title="No putaway task selected" description="Pick a task from the queue to assign a location." />
        )}
      </div>
      )}
    </div>
  );
}
