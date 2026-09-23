import { useMemo, useState } from "react";
import { useIntegrations, useTestConnection } from "@/modules/integrations/hooks/useIntegrations";
import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { SectionsBoard, ConfigRow } from "@/components/workspace/SectionsBoard";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { KpiStat } from "@/types/common";
import styles from "./IntegrationsPage.module.css";

const CONFIG = SYSTEM_CONFIGS.integrations;
const SECTIONS = CONFIG?.tabs ?? ["Integrations", "Health", "Error log", "Retry queue"];
const DEFAULT_SECTION = SECTIONS[0] ?? "Integrations";

function parseLatencyMs(raw: string): number | null {
  const s = String(raw || "").trim().toLowerCase();
  if (!s || s === "—") return null;
  const m = s.match(/([\d.]+)\s*(ms|s)?/);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  return m[2] === "s" ? n * 1000 : n;
}

export function IntegrationsPage() {
  const { data: integrations, isLoading, isError, refetch } = useIntegrations();
  const testConnection = useTestConnection();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [section, setSection] = useState(DEFAULT_SECTION);

  const liveKpis: KpiStat[] = useMemo(() => {
    const list = integrations ?? [];
    const connected = list.filter((i) => i.status.label === "Connected").length;
    const degraded = list.filter((i) => i.status.label === "Degraded" || i.status.label === "Down").length;
    const totalRetries = list.reduce((sum, i) => sum + i.retries, 0);
    const latencies = list.map((i) => parseLatencyMs(i.latency)).filter((n): n is number => n != null);
    const avgMs = latencies.length ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : null;
    const uptimePct =
      list.length > 0 ? `${((connected / list.length) * 100).toFixed(list.length >= 10 ? 1 : 0)}%` : "—";
    const avgSync =
      avgMs == null ? "—" : avgMs >= 1000 ? `${(avgMs / 1000).toFixed(1)} s` : `${avgMs} ms`;
    return [
      { value: String(list.length), label: "Integrations" },
      { value: String(connected), label: "Connected" },
      { value: String(degraded), label: "Degraded", color: degraded ? "var(--amber-tx)" : undefined },
      { value: String(totalRetries), label: "Retries queued", color: totalRetries ? "var(--amber-tx)" : undefined },
      { value: uptimePct, label: "Uptime (connected)" },
      { value: avgSync, label: "Avg sync" },
    ];
  }, [integrations]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !integrations) return <ErrorState message="Couldn't load integrations." onRetry={() => refetch()} />;

  const canEdit = can("integrations", "edit");
  const canTest = canEdit || can("integrations", "view");

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="integrations" />

      <KpiStrip moduleId="integrations" kpis={liveKpis} />

      <div className={styles.toolbar}>
        <Button size="sm" onClick={() => refetch()}>
          Refresh
        </Button>
        {canTest && integrations[0] ? (
          <Button
            size="sm"
            variant="primary"
            onClick={() =>
              testConnection.mutate(integrations[0]!.id || integrations[0]!.system, {
                onSuccess: () => pushToast(`${integrations[0]!.system} — connection healthy`, "success"),
                onError: () => pushToast(`${integrations[0]!.system} — test failed`, "error"),
              })
            }
            isLoading={testConnection.isPending}
          >
            Test connection
          </Button>
        ) : null}
      </div>

      <SectionsBoard
        sections={SECTIONS}
        active={section}
        onSelect={setSection}
        hint={
          section === "Integrations"
            ? "Connection state, last sync and retry queues across the platform and the four apps"
            : undefined
        }
      >
        {section === "Integrations" || section === "Health" ? (
          integrations.length === 0 ? (
            <EmptyState title="No integrations configured" />
          ) : (
            <div className={styles.rows}>
              {integrations.map((i) => (
                <ConfigRow
                  key={i.id || i.system}
                  name={i.system}
                  scope={i.type}
                  detail={`Last sync: ${i.lastSync} · Latency: ${i.latency}`}
                  value={i.environment}
                  updatedLabel={`Retries ${i.retries}`}
                  status={i.status.label}
                  statusTone={i.status.tone}
                  onConfigure={
                    canTest
                      ? () =>
                          testConnection.mutate(i.id || i.system, {
                            onSuccess: () => pushToast(`${i.system} — connection healthy`, "success"),
                            onError: () => pushToast(`${i.system} — test failed`, "error"),
                          })
                      : undefined
                  }
                />
              ))}
            </div>
          )
        ) : (
          <EmptyState title={`No ${section.toLowerCase()} entries from live APIs`} />
        )}
      </SectionsBoard>
    </div>
  );
}
