import { api } from "@/lib/apiClient";
import type { LiveRider, RiderDirectoryEntry } from "@/types/rider";
import type { Tone } from "@/types/common";
import type { RiderStats, RiderTableRow, RidersService } from "./ridersService";

function tone(status?: string): Tone {
  const s = (status ?? "").toLowerCase();
  if (s.includes("deliver") || s.includes("online") || s.includes("active")) return "blue";
  if (s.includes("delay") || s.includes("suspend") || s.includes("inactive") || s.includes("offline")) return "red";
  if (s.includes("complet") || s.includes("approved") || s.includes("resolved")) return "green";
  if (s.includes("break") || s.includes("pending") || s.includes("review") || s.includes("available")) return "amber";
  return "grey";
}

function badge(label: string) {
  return { label, tone: tone(label) };
}

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const r = res as Record<string, unknown>;
  for (const k of ["riders", "items", "list", "data", "payouts", "incidents"]) {
    const v = r[k];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  if (r["data"] && typeof r["data"] === "object") {
    const d = r["data"] as Record<string, unknown>;
    for (const k of ["riders", "items", "list"]) {
      if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function unwrap(res: unknown): Record<string, unknown> {
  const root = res as Record<string, unknown>;
  return ((root?.["data"] ?? root) ?? {}) as Record<string, unknown>;
}

export const realRidersService: RidersService = {
  async listLive(): Promise<LiveRider[]> {
    const res = await api.get<unknown>("/api/v1/rider/dispatch/map/riders");
    const root = res as Record<string, unknown>;
    const data = (root?.["data"] ?? root) as Record<string, unknown>;
    const list = Array.isArray(data?.["riders"])
      ? (data["riders"] as Record<string, unknown>[])
      : extractList(res);
    return list.map((r, i) => {
      const loc = (r["location"] as { lat?: number; lng?: number } | undefined) || {};
      const statusLabel = String(r["status"] ?? "Online");
      return {
        id: String(r["_id"] ?? r["id"] ?? i),
        name: String(r["name"] ?? r["fullName"] ?? "Rider"),
        hub: String(r["hub"] ?? r["darkStore"] ?? r["assignedStore"] ?? r["zone"] ?? "—"),
        currentOrder: String(r["currentOrder"] ?? r["activeOrder"] ?? r["currentOrderId"] ?? "—"),
        zone: String(r["zone"] ?? r["hub"] ?? "—"),
        eta: String(r["eta"] ?? "—"),
        vehicle: String(r["vehicle"] ?? r["vehicleType"] ?? "—"),
        rating: String(r["rating"] ?? "—"),
        status: badge(statusLabel),
        // Map uses percent coords historically; prefer normalized lng/lat into 0-100 when GPS present
        x: Number(r["x"] ?? (typeof loc.lng === "number" ? ((loc.lng - 80.1) / 0.4) * 100 : 50)),
        y: Number(r["y"] ?? (typeof loc.lat === "number" ? ((13.15 - loc.lat) / 0.3) * 100 : 50)),
      };
    });
  },

  async listDirectory(): Promise<RiderDirectoryEntry[]> {
    const res = await api.get<unknown>("/api/v1/admin/riders");
    return extractList(res).map((r) => ({
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

  async listPerformance(): Promise<RiderTableRow[]> {
    const res = await api.get<unknown>("/api/v1/admin/riders");
    return extractList(res).map((r) => [
      String(r["name"] ?? r["fullName"] ?? "Rider"),
      String(r["hub"] ?? r["darkStore"] ?? r["assignedStore"] ?? "—"),
      String(r["deliveriesCount"] ?? r["totalDeliveries"] ?? r["completedDeliveries"] ?? "—"),
      String(r["acceptRate"] ?? r["acceptanceRate"] ?? "—"),
      String(r["onTimeRate"] ?? r["onTimePercent"] ?? "—"),
      String(r["avgDeliveryTime"] ?? r["avgTime"] ?? "—"),
      String(r["rating"] ?? "—"),
      badge(String(r["performanceBand"] ?? r["status"] ?? "Active")),
    ]);
  },

  async listEarnings(): Promise<RiderTableRow[]> {
    const res = await api.get<unknown>("/api/v1/admin/finance/rider-cash/payouts");
    const items = extractList(res);
    return items.map((r) => [
      String(r["riderName"] ?? r["name"] ?? "Rider"),
      String(r["hub"] ?? r["store"] ?? "—"),
      String(r["base"] ?? r["basePay"] ?? r["amount"] ?? "—"),
      String(r["incentive"] ?? "—"),
      String(r["deduction"] ?? "—"),
      String(r["net"] ?? r["total"] ?? r["amount"] ?? "—"),
      String(r["cycle"] ?? r["period"] ?? "Weekly"),
      badge(String(r["status"] ?? "Pending")),
    ]);
  },

  async listIncidents(): Promise<RiderTableRow[]> {
    const res = await api.get<unknown>("/api/v1/darkstore/health/incidents").catch(() => []);
    return extractList(res)
      .filter((r) => r["riderId"] || /rider/i.test(String(r["title"] ?? r["type"] ?? "")))
      .map((r) => [
        String(r["incident_id"] ?? r["_id"] ?? r["id"] ?? "—"),
        String(r["riderName"] ?? r["reported_by"] ?? "—"),
        String(r["type"] ?? "Incident"),
        String(r["orderId"] ?? "—"),
        String(r["zone"] ?? r["store_id"] ?? "—"),
        String(r["description"] ?? r["detail"] ?? "—"),
        String(r["age"] ?? "—"),
        badge(String(r["status"] ?? "open")),
      ]);
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
