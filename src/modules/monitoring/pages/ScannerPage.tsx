import { useMemo, useState } from "react";
import { useScannerDevices, useScannerFeed } from "@/modules/monitoring/hooks/useScanner";
import { DARKSTORE_CONFIGS } from "@/services/workspace/data/darkstores";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import type { ScannerFeedEvent } from "@/types/monitoring";
import type { KpiStat } from "@/types/common";
import styles from "./ScannerPage.module.css";

const CONFIG = DARKSTORE_CONFIGS.scanner;
const TABS = CONFIG?.tabs ?? ["Devices", "Scan activity", "Exceptions", "Audit"];

const FEED_TABS = new Set(["Scan activity", "Exceptions", "Audit"]);

export function ScannerPage() {
  const [tab, setTab] = useState(TABS[0] ?? "Devices");

  const { data: apiDevices, isLoading: devicesLoading, isError: devicesError, refetch: refetchDevices } =
    useScannerDevices();
  const { data: apiFeed, isLoading: feedLoading, isError: feedError, refetch: refetchFeed } = useScannerFeed();

  const devices = apiDevices ?? [];
  const feedAll = apiFeed ?? [];

  const feed = useMemo<ScannerFeedEvent[]>(
    () => (FEED_TABS.has(tab) ? feedAll.filter((e) => e.tab === tab) : []),
    [tab, feedAll],
  );

  const liveKpis: KpiStat[] = useMemo(() => {
    const online = devices.filter((d) => /active|online|idle|ok/i.test(d.status.label)).length;
    const offline = devices.filter((d) => /offline|disconnected/i.test(d.status.label)).length;
    const error = devices.filter((d) => /error|fail|sync pending/i.test(d.status.label)).length;
    const scansToday = devices.reduce((sum, d) => {
      const n = Number(String(d.scansToday).replace(/[^\d.-]/g, ""));
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
    const failEvents = feedAll.filter((e) => e.status.tone === "red" || e.status.tone === "amber").length;
    const errorRate =
      feedAll.length > 0 ? `${((failEvents / feedAll.length) * 100).toFixed(1)}%` : scansToday > 0 ? "0%" : "—";
    return [
      { value: String(devices.length), label: "Scanners" },
      { value: String(online), label: "Online" },
      { value: String(offline), label: "Offline", color: offline ? "var(--red-tx)" : undefined },
      { value: String(error), label: "Error state", color: error ? "var(--amber-tx)" : undefined },
      { value: String(scansToday), label: "Scans today" },
      { value: errorRate, label: "Scan error rate" },
    ];
  }, [devices, feedAll]);

  if (devicesLoading || feedLoading) return <CardSkeleton />;
  if (devicesError || feedError) {
    return (
      <ErrorState
        message="Couldn't load scanner fleet."
        onRetry={() => {
          void refetchDevices();
          void refetchFeed();
        }}
      />
    );
  }

  return (
    <div className={styles.wrap}>
      {CONFIG ? (
        <Card className={styles.hintCard}>
          <p className={styles.hint}>{CONFIG.hint}</p>
        </Card>
      ) : null}

      <KpiStrip kpis={liveKpis} moduleId="scanner" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Devices" ? (
        devices.length === 0 ? (
          <EmptyState title="No scanners registered" />
        ) : (
          <div className={styles.deviceGrid}>
            {devices.map((device) => (
              <Card key={device.id} className={styles.deviceCard}>
                <div className={styles.deviceHeader}>
                  <div className={styles.deviceTop}>
                    <span className={styles.statusDot} data-tone={device.status.tone} />
                    <span className={styles.deviceId}>{device.id}</span>
                  </div>
                  <Badge label={device.status.label} tone={device.status.tone} />
                </div>
                <div className={styles.deviceStore}>{device.store}</div>
                <div className={styles.deviceOperator}>{device.operator}</div>
                <div className={styles.deviceFields}>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Network</span>
                    <span className={styles.fieldValue}>{device.network}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Last sync</span>
                    <span className={styles.fieldValue}>{device.lastSync}</span>
                  </div>
                  <div className={styles.field}>
                    <span className={styles.fieldLabel}>Scans today</span>
                    <span className={styles.fieldValue}>{device.scansToday}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )
      ) : feed.length === 0 ? (
        <EmptyState title={`No events in "${tab}"`} />
      ) : (
        <Card className={styles.feedCard}>
          {feed.map((event) => (
            <div key={event.id} className={styles.feedRow} data-tone={event.status.tone}>
              <span className={styles.feedTime}>{event.time}</span>
              <div className={styles.feedBody}>
                <div className={styles.feedTop}>
                  <span className={styles.feedAction}>{event.action}</span>
                  <Badge label={event.status.label} tone={event.status.tone} />
                </div>
                <div className={styles.feedMeta}>
                  {event.store} · {event.operator} · {event.reference} · {event.device}
                </div>
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
