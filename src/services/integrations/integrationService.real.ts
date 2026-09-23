import { api } from "@/lib/apiClient";
import type { IntegrationHealth } from "@/types/integration";
import type { IntegrationService } from "./integrationService";
import type { Tone } from "@/types/common";

type RawIntegration = {
  id?: string;
  serviceKey?: string;
  displayName?: string;
  name?: string;
  provider?: string;
  status?: string;
  message?: string;
  system?: string;
  type?: string;
  environment?: string;
  lastSync?: string;
  latency?: string;
  errors24h?: number;
  retries?: number;
};

function toneFor(status: string): Tone {
  const s = status.toLowerCase();
  if (s === "healthy" || s === "connected" || s === "active") return "green";
  if (s === "degraded" || s === "unknown" || s === "warning") return "amber";
  if (s === "down" || s === "error" || s === "failed") return "red";
  return "grey";
}

function labelFor(status: string): string {
  const s = status.toLowerCase();
  if (s === "healthy" || s === "active") return "Connected";
  if (s === "degraded" || s === "unknown") return "Degraded";
  if (s === "down" || s === "error" || s === "failed") return "Down";
  return status || "Unknown";
}

function mapIntegration(raw: RawIntegration): IntegrationHealth {
  const system = String(
    raw.system ?? raw.displayName ?? raw.name ?? raw.serviceKey ?? "Integration",
  );
  const statusRaw = String(raw.status ?? "unknown");
  const lastSyncFromMessage =
    typeof raw.message === "string" && raw.message.startsWith("Last sync:")
      ? raw.message.replace(/^Last sync:\s*/i, "").trim()
      : null;
  const id = raw.id ? String(raw.id) : undefined;
  return {
    id,
    system,
    type: String(raw.type ?? raw.provider ?? raw.serviceKey ?? "integration"),
    environment: String(raw.environment ?? "production"),
    lastSync: String(raw.lastSync ?? lastSyncFromMessage ?? "—"),
    latency: String(raw.latency ?? "—"),
    errors24h: Number(raw.errors24h ?? 0),
    retries: Number(raw.retries ?? 0),
    status: { label: labelFor(statusRaw), tone: toneFor(statusRaw) },
  };
}

export const realIntegrationService: IntegrationService = {
  async list(): Promise<IntegrationHealth[]> {
    const res = await api.get<
      | IntegrationHealth[]
      | {
          list?: RawIntegration[];
          integrations?: RawIntegration[];
          data?: RawIntegration[];
        }
    >("/api/v1/admin/integrations/health");

    if (Array.isArray(res)) {
      return res.map((row) => mapIntegration(row as RawIntegration));
    }

    const envelope = res as {
      list?: RawIntegration[];
      integrations?: RawIntegration[];
      data?: RawIntegration[];
    };
    // Backend returns top-level `{ success, integrations }` (apiClient keeps whole body when no `data`)
    const rows = envelope.integrations ?? envelope.list ?? envelope.data ?? [];
    return rows.map(mapIntegration);
  },

  async testConnection(system: string): Promise<IntegrationHealth> {
    const res = await api.post<IntegrationHealth | { message?: string }>(
      `/api/v1/admin/integrations/${encodeURIComponent(system)}/test`,
    );
    if (res && typeof res === "object" && "system" in res) {
      return mapIntegration(res as RawIntegration);
    }
    return {
      id: system,
      system,
      type: "integration",
      environment: "production",
      lastSync: new Date().toISOString(),
      latency: "—",
      errors24h: 0,
      retries: 0,
      status: { label: "Connected", tone: "green" },
    };
  },
};
