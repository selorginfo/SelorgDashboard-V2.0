import { api } from "@/lib/apiClient";
import type { LiveRider, RiderDirectoryEntry } from "@/types/rider";
import type { Tone } from "@/types/common";
import type { RidersService, RiderStats } from "./ridersService";

function tone(status?: string): Tone {
  const s = (status ?? "").toLowerCase();
  if (s.includes("deliver") || s.includes("online") || s.includes("active")) return "blue";
  if (s.includes("delay") || s.includes("suspend") || s.includes("inactive") || s.includes("offline")) return "red";
  if (s.includes("complet") || s.includes("approved")) return "green";
  if (s.includes("break") || s.includes("pending") || s.includes("review") || s.includes("available")) return "amber";
  return "grey";
}

function badge(label: string) {
  return { label, tone: tone(label) };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extract<T>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];
  const r = res as Record<string, unknown>;
  return ((r["data"] ?? r["list"] ?? r["riders"] ?? []) as T[]);
}

function unwrap(res: unknown): Record<string, unknown> {
  const root = res as Record<string, unknown>;
  return ((root?.["data"] ?? root) ?? {}) as Record<string, unknown>;
}

// Errors propagate in every method below. These used to be caught and turned into empty lists and
// zeroed counters, so an expired session or a 500 rendered as "no riders online, nothing
// unassigned" — the most dangerous possible reading of a live dispatch screen.
export const realRidersService: RidersService = {
  async listLive(): Promise<LiveRider[]> {
    const res = await api.get<unknown>("/api/v1/rider/dispatch/map/riders");
    return extract<Record<string, unknown>>(res).map((r, i) => ({
      id: String(r["_id"] ?? r["id"] ?? i),
      name: String(r["name"] ?? r["fullName"] ?? "Rider"),
      hub: String(r["hub"] ?? r["darkStore"] ?? r["assignedStore"] ?? "—"),
      currentOrder: String(r["currentOrder"] ?? r["activeOrder"] ?? "—"),
      zone: String(r["zone"] ?? "—"),
      eta: String(r["eta"] ?? "—"),
      vehicle: String(r["vehicle"] ?? r["vehicleType"] ?? "—"),
      rating: String(r["rating"] ?? "—"),
      status: badge(String(r["status"] ?? "Online")),
      x: Number(r["x"] ?? r["lng"] ?? 50),
      y: Number(r["y"] ?? r["lat"] ?? 50),
    }));
  },

  async listDirectory(): Promise<RiderDirectoryEntry[]> {
    const res = await api.get<unknown>("/api/v1/admin/riders");
    return extract<Record<string, unknown>>(res).map((r) => ({
      name: String(r["name"] ?? r["fullName"] ?? "Rider"),
      hub: String(r["hub"] ?? r["darkStore"] ?? r["assignedStore"] ?? "—"),
      phone: String(r["phone"] ?? r["mobile"] ?? "—"),
      zone: String(r["zone"] ?? "—"),
      kyc: r["kycStatus"] === "verified" ? "KYC verified" : String(r["kycStatus"] ?? "—"),
      vehicle: String(r["vehicle"] ?? r["vehicleType"] ?? "—"),
      rating: String(r["rating"] ?? "—"),
      status: badge(String(r["status"] ?? r["onboardingStatus"] ?? "—")),
    }));
  },

  /**
   * Rider counts come from `/rider/dashboard/counts` and the backlog from
   * `/rider/dispatch/unassigned/count`.
   *
   * This previously read `online`/`onDelivery`/`available`/`delayed`/`unassignedOrders` off
   * `/rider/fleet/summary`, which returns *vehicle* counts (`total`/`active`/`maintenance`/
   * `inactive`) and none of those keys — so every KPI on the live riders screen silently
   * rendered 0 regardless of the real fleet state.
   */
  async getStats(): Promise<RiderStats> {
    const [countsRes, unassignedRes] = await Promise.all([
      api.get<unknown>("/api/v1/rider/dashboard/counts"),
      api.get<unknown>("/api/v1/rider/dispatch/unassigned/count"),
    ]);
    const counts = unwrap(countsRes);
    const unassigned = unwrap(unassignedRes);
    return {
      online: Number(counts["online"] ?? 0),
      onDelivery: Number(counts["busy"] ?? 0),
      available: Number(counts["idle"] ?? 0),
      unassignedOrders: Number(unassigned["count"] ?? 0),
      delayed: null,
      onTimePercent: null,
    };
  },

  async assignOrder(orderId: string, riderId: string): Promise<unknown> {
    return api.post("/api/v1/rider/dispatch/assign", { orderId, riderId });
  },

  async updateRiderStatus(riderId: string, status: string): Promise<unknown> {
    return api.put(`/api/v1/rider/${encodeURIComponent(riderId)}`, { status });
  },

  async raiseIncident(input: { riderId: string; title: string; detail?: string }): Promise<unknown> {
    return api.post("/api/v1/darkstore/health/incidents", {
      title: input.title,
      detail: input.detail || `Raised for rider ${input.riderId}`,
      riderId: input.riderId,
      source: "dashboard-riders-live",
    });
  },
};
