import { api } from "@/lib/apiClient";
import type { OpsRouteState } from "@/modules/ops/types";
import type { ApplyActionInput, OpsService, SaveRecordInput } from "./opsService";

export const realOpsService: OpsService = {
  async getRoute(route) {
    return api.get<OpsRouteState>(`/api/v1/admin/ops-routes/${route}`);
  },

  async getKpis(route) {
    // Prefer unified ops-routes/kpis, fall back to resource mount /kpis
    try {
      return await api.get<{ value: string; label: string; color?: string }[]>(
        `/api/v1/admin/ops-routes/${route}/kpis`,
      );
    } catch {
      const mounts: Record<string, string> = {
        deliveries: "/api/v1/admin/deliveries/kpis",
        "bd-overview": "/api/v1/admin/bulk-delivery/overview/kpis",
        "bd-queue": "/api/v1/admin/bulk-delivery/queue/kpis",
        "bd-batches": "/api/v1/admin/bulk-delivery/batches/kpis",
        "bd-track": "/api/v1/admin/bulk-delivery/trips/kpis",
        "bd-ops": "/api/v1/admin/bulk-delivery/operators/kpis",
        "bd-exceptions": "/api/v1/admin/bulk-delivery/exceptions/kpis",
        vehicles: "/api/v1/admin/fleet/vehicles/kpis",
      };
      const path = mounts[route];
      if (!path) return [];
      return api.get(path);
    }
  },

  async calculateRoute(stops) {
    return api.post(`/api/v1/admin/routing/calculate`, { stops });
  },

  async applyAction({ route, ids, action, values }: ApplyActionInput) {
    return api.post<OpsRouteState>(`/api/v1/admin/ops-routes/${route}/actions`, { ids, action, values });
  },

  async saveRecord({ route, tab, id, row, note }: SaveRecordInput) {
    return api.post<OpsRouteState>(`/api/v1/admin/ops-routes/${route}/records`, { tab, id, row, note });
  },

  async deleteRecord(route, id) {
    return api.delete<OpsRouteState>(`/api/v1/admin/ops-routes/${route}/records/${encodeURIComponent(id)}`);
  },

  async advanceStage(route, id) {
    return api.post<OpsRouteState>(`/api/v1/admin/ops-routes/${route}/records/${encodeURIComponent(id)}/advance`, {});
  },
};
