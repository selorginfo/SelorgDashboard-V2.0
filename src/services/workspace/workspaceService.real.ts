import { api } from "@/lib/apiClient";
import type { WorkspaceConfig, WorkspaceRow } from "@/types/common";
import type { ModuleId } from "@/constants/nav";
import type { WorkspaceService } from "./workspaceService";
import { WORKSPACE_CONFIGS } from "./workspaceData";
import { endpointsForModule, invokeCatalogEndpoint } from "@/services/system/dashboardApiCatalog";

function asRecords(data: unknown): Record<string, unknown>[] {
  if (Array.isArray(data)) {
    return data.filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === "object");
  }
  if (data && typeof data === "object") {
    const rec = data as Record<string, unknown>;
    for (const key of ["items", "data", "results", "records", "rows", "list"]) {
      if (Array.isArray(rec[key])) return asRecords(rec[key]);
    }
    return [rec];
  }
  return [];
}

function cell(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export const realWorkspaceService: WorkspaceService = {
  async getConfig(moduleId: ModuleId): Promise<WorkspaceConfig | null> {
    const seed = WORKSPACE_CONFIGS[moduleId];
    let fromPlatform: WorkspaceConfig | null = null;
    try {
      fromPlatform = await api.get<WorkspaceConfig | null>(`/api/v1/admin/platform-config/workspace.${moduleId}`);
    } catch {
      fromPlatform = null;
    }

    const gets = endpointsForModule(moduleId).filter((ep) => ep.method === "GET").slice(0, 6);
    const probes = await Promise.all(
      gets.map(async (ep) => {
        try {
          return { ep, data: await invokeCatalogEndpoint(ep), error: null as string | null };
        } catch (err) {
          return { ep, data: null, error: (err as Error).message };
        }
      })
    );

    const live = probes.find((p) => p.data != null);
    const records = live ? asRecords(live.data) : [];
    const columns =
      records[0] ? Object.keys(records[0]).slice(0, 8) : seed?.columns ?? fromPlatform?.columns ?? ["Field", "Value"];
    const tab = seed?.tabs[0] ?? fromPlatform?.tabs[0] ?? "Live";
    const liveRows: WorkspaceRow[] = records.map((row) => columns.map((key) => cell(row[key])));
    const tabs = seed?.tabs?.length ? seed.tabs : fromPlatform?.tabs?.length ? fromPlatform.tabs : ["Live"];
    const rows = Object.fromEntries(tabs.map((name) => [name, liveRows]));

    return {
      hint:
        seed?.hint ??
        fromPlatform?.hint ??
        `Live backend data for ${moduleId}${live ? ` via ${live.ep.method} ${live.ep.path}` : ""}`,
      flow: seed?.flow ?? fromPlatform?.flow ?? [],
      flowAt: seed?.flowAt ?? fromPlatform?.flowAt,
      kpis: [
        { label: "Live records", value: String(records.length) },
        { label: "APIs probed", value: String(gets.length) },
        { label: "Healthy", value: String(probes.filter((p) => !p.error).length) },
        ...(seed?.kpis?.slice(0, 1) ?? []),
      ],
      tabs,
      columns,
      rows: liveRows.length > 0 ? rows : seed?.rows ?? fromPlatform?.rows ?? { [tab]: [] },
      chart: seed?.chart ?? fromPlatform?.chart,
    };
  },
};
