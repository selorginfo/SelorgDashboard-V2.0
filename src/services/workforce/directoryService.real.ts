import { api } from "@/lib/apiClient";
import type { WorkforcePerson, WorkerKind } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { DirectoryService } from "./directoryService";

function pathForKind(kind: WorkerKind): string {
  return kind === "rider" ? "/api/v1/admin/riders" : "/api/v1/admin/picker/pickers";
}

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "riders", "pickers"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "available").toLowerCase();
  if (s.includes("suspend")) return { label: "Suspended", tone: "red" };
  if (s.includes("deliver") || s.includes("on_delivery") || s === "busy") return { label: "On delivery", tone: "blue" };
  if (s.includes("shift") || s.includes("picking")) return { label: "On shift", tone: "blue" };
  if (s.includes("offline") || s.includes("inactive")) return { label: "Offline", tone: "grey" };
  if (s.includes("delay")) return { label: "Delayed", tone: "red" };
  if (s.includes("approv") || s.includes("active") || s.includes("available") || s.includes("online")) {
    return { label: "Available", tone: "green" };
  }
  return { label: "Available", tone: "green" };
}

function tabFor(status: Badge, kind: WorkerKind): string {
  const l = status.label;
  if (l === "Suspended") return "Suspended";
  if (l === "Offline") return "Offline";
  if (l === "On delivery" || l === "Delayed") return "On delivery";
  if (l === "On shift") return "On shift";
  return "Available";
}

function mapPerson(raw: Record<string, unknown>, kind: WorkerKind, index: number): WorkforcePerson {
  const status = statusBadge(raw.status ?? raw.workStatus ?? raw.onlineStatus);
  const name = String(raw.name ?? raw.fullName ?? raw.riderName ?? raw.pickerName ?? `Worker ${index + 1}`);
  return {
    id: String(raw.id ?? raw._id ?? `${kind}-${index}`),
    kind,
    name,
    locationLabel: kind === "rider" ? "Zone" : "Store",
    location: String(raw.location ?? raw.zone ?? raw.darkStore ?? raw.store ?? raw.hub ?? "—"),
    contactLabel: "Phone",
    contact: String(raw.phone ?? raw.mobile ?? raw.contact ?? "—"),
    vehicle: kind === "rider" ? String(raw.vehicle ?? raw.vehicleType ?? "") || undefined : undefined,
    stats: [
      { label: kind === "rider" ? "Deliveries" : "Orders", value: String(raw.deliveriesToday ?? raw.ordersToday ?? raw.orders ?? "0") },
      { label: kind === "rider" ? "On-time" : "Accuracy", value: String(raw.onTime ?? raw.accuracy ?? "—") },
      { label: "Rating", value: String(raw.rating ?? raw.avgRating ?? "—") },
    ],
    status,
    tab: String(raw.tab ?? tabFor(status, kind)),
  };
}

export const realDirectoryService: DirectoryService = {
  async list(kind: WorkerKind): Promise<WorkforcePerson[]> {
    const res = await api.get<unknown>(pathForKind(kind));
    return extractList(res).map((row, i) => mapPerson(row, kind, i));
  },

  async setStatus(kind: WorkerKind, id: string, status: Badge, _tab: string): Promise<WorkforcePerson> {
    const apiStatus = status.label === "Suspended" ? "suspended" : "active";
    const res = await api.patch<Record<string, unknown>>(`${pathForKind(kind)}/${id}/status`, {
      status: apiStatus,
      label: status.label,
    });
    return mapPerson(res && typeof res === "object" ? { ...res, status } : { id, status, name: id }, kind, 0);
  },
};
