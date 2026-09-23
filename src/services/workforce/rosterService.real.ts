import { api } from "@/lib/apiClient";
import type { RosterEntry } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { RosterService } from "./rosterService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "requests", "roster", "entries", "shifts"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "confirmed").toLowerCase();
  if (s.includes("await") || s.includes("pending")) return { label: "Awaiting approval", tone: "amber" };
  if (s.includes("under") || s.includes("short") || s.includes("gap")) return { label: "Understaffed", tone: "red" };
  if (s.includes("reject") || s.includes("cancel")) return { label: "Rejected", tone: "red" };
  if (s.includes("approv") || s.includes("confirm") || s.includes("staff")) return { label: "Staffed", tone: "green" };
  return { label: "Staffed", tone: "green" };
}

function tabFor(status: Badge, raw: Record<string, unknown>): string {
  if (raw.tab) return String(raw.tab);
  if (status.label === "Awaiting approval") return "Swap requests";
  if (status.label === "Understaffed") return "Today";
  const when = String(raw.day ?? raw.date ?? raw.when ?? "").toLowerCase();
  if (when.includes("tomorrow")) return "Tomorrow";
  if (when.includes("week")) return "This week";
  return "Today";
}

function mapEntry(raw: Record<string, unknown>, index: number): RosterEntry {
  const assigned = Number(raw.assigned ?? raw.assignedCount ?? raw.headcount ?? 0);
  const target = Number(raw.target ?? raw.headcountTarget ?? raw.required ?? Math.max(assigned, 1));
  const confirmed = Number(raw.confirmed ?? raw.confirmedCount ?? assigned);
  const gap = Math.max(0, target - assigned);
  const status = statusBadge(raw.status ?? (gap > 0 ? "understaffed" : "staffed"));
  return {
    id: String(raw.id ?? raw._id ?? raw.requestId ?? `roster-${index}`),
    shift: String(raw.shift ?? raw.shiftName ?? raw.name ?? `Shift ${index + 1}`),
    location: String(raw.location ?? raw.store ?? raw.darkStore ?? raw.hub ?? "—"),
    assigned: String(assigned),
    target: String(target),
    confirmed: String(confirmed),
    gap: String(gap),
    starts: String(raw.starts ?? raw.startTime ?? raw.start ?? "—"),
    status,
    tab: tabFor(status, raw),
  };
}

export const realRosterService: RosterService = {
  async list(): Promise<RosterEntry[]> {
    // Prefer shift-change requests; also merge warehouse staff shifts as staffing rows when present.
    const [reqRes, shiftRes] = await Promise.all([
      api.get<unknown>("/api/v1/admin/picker/shift-change-requests").catch(() => []),
      api.get<unknown>("/api/v1/warehouse/staff/shifts").catch(() => []),
    ]);
    const fromRequests = extractList(reqRes).map(mapEntry);
    const fromShifts = extractList(shiftRes).map((raw, i) =>
      mapEntry(
        {
          ...raw,
          shift: raw.name ?? raw.shift,
          assigned: raw.assigned ?? raw.headcount ?? 0,
          target: raw.headcountTarget ?? raw.target ?? 1,
          tab: "Today",
        },
        i + fromRequests.length,
      ),
    );
    // Prefer requests when both exist; otherwise show shift-derived roster rows so the board isn't empty.
    return fromRequests.length > 0 ? fromRequests : fromShifts;
  },

  async approveSwap(id: string): Promise<RosterEntry> {
    const res = await api.post<Record<string, unknown>>(
      `/api/v1/admin/picker/shift-change-requests/${id}/decision`,
      { decision: "approve" },
    );
    return mapEntry(res && typeof res === "object" ? res : { id, status: "approved" }, 0);
  },

  async fillGap(id: string): Promise<RosterEntry> {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/admin/picker/pickers/${id}/assignment`, {
      action: "fill-gap",
    });
    return mapEntry(res && typeof res === "object" ? res : { id, gap: 0 }, 0);
  },
};
