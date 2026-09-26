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
  if (r.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    for (const k of ["pickers", "list", "items", "riders"]) {
      if (Array.isArray(d[k])) return d[k] as Record<string, unknown>[];
    }
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "").toLowerCase();
  if (s.includes("suspend") || s === "inactive" || s === "blocked") return { label: "Suspended", tone: "red" };
  if (s.includes("deliver") || s.includes("on_delivery") || s === "busy") return { label: "On delivery", tone: "blue" };
  if (s.includes("on_shift") || s === "picking" || (s.includes("shift") && !s.includes("off"))) {
    return { label: "On shift", tone: "blue" };
  }
  if (s.includes("offline") || s.includes("inactive") || s === "pending" || s === "rejected") {
    return { label: "Offline", tone: "grey" };
  }
  if (s.includes("delay")) return { label: "Delayed", tone: "red" };
  if (s.includes("available") || s.includes("online") || s === "idle") {
    return { label: "Available", tone: "green" };
  }
  // Do not default ACTIVE account status to Available — that requires an active shift.
  if (s.includes("active") || s.includes("approv")) return { label: "Offline", tone: "grey" };
  return { label: "Offline", tone: "grey" };
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
  let status: Badge;

  if (kind === "rider") {
    const liveOrStatus = raw.onlineStatus ?? raw.workStatus ?? raw.status;
    status = statusBadge(
      raw.isOnline === false && String(raw.status).toUpperCase() === "ACTIVE" ? "offline" : liveOrStatus ?? raw.status,
    );
    if (raw.isOnline === true && !raw.activeOrderId && !raw.currentOrderId) {
      status = { label: "Available", tone: "green" };
    } else if (raw.activeOrderId || raw.currentOrderId) {
      status = { label: "On delivery", tone: "blue" };
    }
  } else {
    // Pickers: trust backend workStatus (Available only while on an active shift).
    const account = String(raw.status ?? "").toUpperCase();
    const ws = String(raw.workStatus ?? raw.onlineStatus ?? "").toLowerCase();
    if (account === "SUSPENDED" || account === "INACTIVE" || account === "BLOCKED" || ws === "suspended") {
      status = { label: "Suspended", tone: "red" };
    } else if (ws === "available") {
      status = { label: "Available", tone: "green" };
    } else if (ws === "on_shift") {
      status = { label: "On shift", tone: "blue" };
    } else if (
      (Boolean(raw.activeShiftId) || raw.onShift === true) &&
      raw.isOnline === true &&
      !raw.activeOrderId &&
      !raw.onBreak
    ) {
      status = { label: "Available", tone: "green" };
    } else if ((Boolean(raw.activeShiftId) || raw.onShift === true) && raw.isOnline === true) {
      status = { label: "On shift", tone: "blue" };
    } else {
      status = { label: "Offline", tone: "grey" };
    }
  }

  const name = String(raw.name ?? raw.fullName ?? raw.riderName ?? raw.pickerName ?? `Worker ${index + 1}`);
  // Prefer Mongo ObjectId for actions — never short employee / slice(-4) profile ids
  const mongoId = String(raw._id ?? raw.id ?? `${kind}-${index}`);
  const store =
    kind === "picker"
      ? String(
          raw.darkStore ??
            raw.store ??
            raw.hub ??
            raw.currentLocationId ??
            raw.assignedStore ??
            raw.location ??
            "—",
        )
      : String(raw.location ?? raw.zone ?? raw.darkStore ?? raw.store ?? raw.hub ?? "—");
  return {
    id: mongoId,
    kind,
    name,
    locationLabel: kind === "rider" ? "Zone" : "Store",
    location: store || "—",
    contactLabel: "Phone",
    contact: String(raw.phone ?? raw.mobile ?? raw.contact ?? "—"),
    vehicle: kind === "rider" ? String(raw.vehicle ?? raw.vehicleType ?? "") || undefined : undefined,
    stats: [
      { label: kind === "rider" ? "Deliveries" : "Orders", value: String(raw.deliveriesToday ?? raw.ordersToday ?? raw.orders ?? raw.deliveriesCount ?? raw.totalDeliveries ?? "0") },
      { label: kind === "rider" ? "On-time" : "Accuracy", value: String(raw.onTime ?? raw.onTimeRate ?? raw.accuracy ?? "—") },
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
