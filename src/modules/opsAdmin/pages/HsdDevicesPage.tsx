import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { OpsRangeFilter, type OpsRangeFilterValue } from "@/modules/opsAdmin/components/OpsRangeFilter";
import { useHsdDeviceHistory, useHsdDevices } from "@/modules/opsAdmin/hooks/useAdminOps";
import type { KpiStat } from "@/types/common";
import styles from "./OpsAdmin.module.css";

export function HsdDevicesPage() {
  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [range, setRange] = useState<OpsRangeFilterValue>({
    range: "today",
    from: "",
    to: "",
  });

  const devicesQ = useHsdDevices();
  const historyQ = useHsdDeviceHistory(selectedId, range);
  const devices = devicesQ.data ?? [];

  const kpis: KpiStat[] = useMemo(() => {
    const online = devices.filter((d) => /online|active|idle|ok/i.test(d.status.label)).length;
    const offline = devices.filter((d) => /offline|disconnect/i.test(d.status.label)).length;
    const assigned = devices.filter((d) => Boolean(d.assignedTo)).length;
    return [
      { value: String(devices.length), label: "Devices" },
      { value: String(online), label: "Online" },
      { value: String(offline), label: "Offline", color: offline ? "var(--red-tx)" : undefined },
      { value: String(assigned), label: "Assigned" },
    ];
  }, [devices]);

  if (devicesQ.isLoading) return <CardSkeleton />;
  if (devicesQ.isError) {
    return (
      <ErrorState message="Couldn't load HSD devices." onRetry={() => void devicesQ.refetch()} />
    );
  }

  const selected = devices.find((d) => d.id === selectedId);

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="hsd-devices" />

      <KpiStrip kpis={kpis} moduleId="hsd-devices" />

      {devices.length === 0 ? (
        <EmptyState title="No HSD devices registered" />
      ) : (
        <div className={styles.deviceGrid}>
          {devices.map((device) => (
            <Card
              key={device.id}
              className={styles.deviceCard}
              data-active={device.id === selectedId}
              onClick={() => setSelectedId(device.id)}
            >
              <div className={styles.deviceHeader}>
                <span className={styles.deviceId}>{device.deviceId}</span>
                <Badge label={device.status.label} tone={device.status.tone} />
              </div>
              <div className={styles.deviceStore}>{device.label}</div>
              <div className={styles.deviceMeta}>
                {[device.store, device.assignedTo, device.model, device.lastSeen]
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            </Card>
          ))}
        </div>
      )}

      {selectedId ? (
        <>
          <Card className={styles.filterCard}>
            <p className={styles.note}>
              History for {selected?.label ?? selectedId} ({selected?.deviceId ?? selectedId})
            </p>
            <OpsRangeFilter value={range} onChange={setRange} />
          </Card>
          {historyQ.isLoading ? (
            <CardSkeleton />
          ) : historyQ.isError ? (
            <EmptyState title="No device history for this range" />
          ) : (historyQ.data?.length ?? 0) === 0 ? (
            <EmptyState title="No device history for this range" />
          ) : (
            <Card className={styles.feedCard}>
              {(historyQ.data ?? []).map((ev) => (
                <div key={ev.id} className={styles.feedRow}>
                  <span className={styles.feedTime}>{ev.time}</span>
                  <div className={styles.feedBody}>
                    <div className={styles.feedEvent}>{ev.event}</div>
                    <div className={styles.feedMeta}>
                      {[ev.orderNumber, ev.actor, ev.detail].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </>
      ) : devices.length > 0 ? (
        <EmptyState title="Select a device to view history" />
      ) : null}
    </div>
  );
}
