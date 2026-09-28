import { api } from "@/lib/apiClient";
import type { LiveShiftWorker, ShiftTemplate } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { CreateShiftInput, ShiftsService } from "./shiftsService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "shifts", "templates", "slots"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  if (r.items && Array.isArray((r as { items: unknown }).items)) {
    return (r as { items: Record<string, unknown>[] }).items;
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "active").toLowerCase();
  if (s.includes("draft")) return { label: "Draft", tone: "grey" };
  if (s.includes("cancel") || s.includes("retir") || s.includes("inactive") || s.includes("archiv")) {
    return { label: "Retired", tone: "grey" };
  }
  return { label: "Active", tone: "green" };
}

function mapTemplate(raw: Record<string, unknown>, index: number): ShiftTemplate {
  const appliesRaw = String(raw.appliesTo ?? raw.workforce ?? raw.role ?? raw.type ?? "Rider").toLowerCase();
  const appliesTo: "Picker" | "Rider" = appliesRaw.includes("picker") ? "Picker" : "Rider";
  const start = raw.startTime ?? raw.start;
  const end = raw.endTime ?? raw.end;
  const hours =
    raw.hours != null
      ? String(raw.hours)
      : start && end
        ? `${start} – ${end}`
        : "—";
  return {
    id: String(raw.id ?? raw._id ?? `shift-${index}`),
    name: String(raw.name ?? raw.title ?? raw.templateName ?? `Shift ${index + 1}`),
    appliesTo,
    hours,
    days: String(raw.days ?? raw.dayPattern ?? "Mon–Sun"),
    breakTime: String(raw.breakTime ?? raw.break ?? `${raw.breakMinutes ?? 30} min`),
    headcountTarget: String(raw.headcountTarget ?? raw.headcount ?? raw.capacity ?? raw.target ?? "—"),
    scope: String(raw.scope ?? raw.store ?? raw.stores ?? raw.hub ?? raw.hubName ?? raw.city ?? "All stores"),
    status: statusBadge(raw.status),
    startTime: start != null ? String(start) : undefined,
    endTime: end != null ? String(end) : undefined,
    warehouseKey: raw.hubId != null || raw.warehouseKey != null ? String(raw.hubId ?? raw.warehouseKey) : undefined,
  };
}

function mapLiveWorker(raw: Record<string, unknown>, index: number): LiveShiftWorker {
  return {
    id: String(raw.id ?? raw.assignmentId ?? `live-${index}`),
    picker: String(raw.picker ?? raw.name ?? "—"),
    role: String(raw.role ?? "Picker"),
    darkStore: String(raw.darkStore ?? raw.warehouseKey ?? "—"),
    shiftName: String(raw.shiftName ?? raw.shift ?? "—"),
    hours: String((raw.hours ?? `${raw.startTime ?? ""} – ${raw.endTime ?? ""}`.trim()) || "—"),
    startTime: String(raw.startTime ?? ""),
    endTime: String(raw.endTime ?? ""),
    bookingStatus: String(raw.bookingStatus ?? "—"),
    currentStatus: String(raw.currentStatus ?? (raw.onShift ? "On Shift" : "Offline")),
    startedAt: raw.startedAt != null ? String(raw.startedAt) : null,
    onShift: Boolean(raw.onShift),
    isOnline: Boolean(raw.isOnline),
  };
}

export const realShiftsService: ShiftsService = {
  async list(): Promise<ShiftTemplate[]> {
    const res = await api.get<unknown>("/api/v1/rider/shifts?limit=100");
    const list = extractList(res);
    if (list.length > 0) return list.map(mapTemplate);
    const fallback = await api.get<unknown>("/api/v1/warehouse/staff/shifts").catch(() => []);
    return extractList(fallback).map(mapTemplate);
  },

  async create(input: CreateShiftInput): Promise<ShiftTemplate> {
    const startTime =
      input.startTime ||
      String(input.hours)
        .split(/[–-]/)
        .map((s) => s.trim())[0] ||
      "09:00";
    const endTime =
      input.endTime ||
      String(input.hours)
        .split(/[–-]/)
        .map((s) => s.trim())[1] ||
      "17:00";
    const hubId = input.hubId || (input.scope && input.scope !== "All stores" ? input.scope : undefined);
    if (!hubId) {
      throw new Error("Please select a Dark Store for this shift.");
    }
    const res = await api.post<Record<string, unknown>>("/api/v1/rider/shifts", {
      name: input.name,
      startTime,
      endTime,
      capacity: input.capacity ?? (Number(input.headcountTarget) || 1),
      hubId,
      hubName: input.hubName || input.scope || hubId,
      status: "published",
      breakMinutes: input.breakMinutes ?? (parseInt(String(input.breakTime), 10) || 30),
      appliesTo: input.appliesTo,
      workforceRole: input.appliesTo === "Picker" ? "picker" : "rider",
    });
    return mapTemplate(res && typeof res === "object" ? res : { ...input, status: "published" }, 0);
  },

  async activate(id: string): Promise<ShiftTemplate> {
    const res = await api.put<Record<string, unknown>>(`/api/v1/rider/shifts/${id}`, { status: "published" });
    return mapTemplate(res && typeof res === "object" ? res : { id, status: "published" }, 0);
  },

  async update(
    id: string,
    patch: Partial<Pick<ShiftTemplate, "hours" | "days" | "breakTime" | "headcountTarget" | "name">>,
  ): Promise<ShiftTemplate> {
    const body: Record<string, unknown> = { ...patch };
    if (patch.hours) {
      const [startTime, endTime] = String(patch.hours)
        .split(/[–-]/)
        .map((s) => s.trim());
      body.startTime = startTime;
      body.endTime = endTime;
    }
    if (patch.headcountTarget != null) body.capacity = Number(patch.headcountTarget) || 1;
    if (patch.breakTime != null) body.breakMinutes = parseInt(String(patch.breakTime), 10) || 0;
    const res = await api.put<Record<string, unknown>>(`/api/v1/rider/shifts/${id}`, body);
    return mapTemplate(res && typeof res === "object" ? { id, ...patch, ...res } : { id, ...patch }, 0);
  },

  async duplicate(id: string): Promise<ShiftTemplate> {
    const existing = await api.get<Record<string, unknown>>(`/api/v1/rider/shifts/${id}`);
    const base = existing && typeof existing === "object" ? existing : { id };
    const res = await api.post<Record<string, unknown>>("/api/v1/rider/shifts", {
      ...base,
      id: undefined,
      _id: undefined,
      name: `${String(base.name ?? "Shift")} (copy)`,
      status: "published",
      hubId: base.hubId || base.warehouseKey || base.scope,
      hubName: base.hubName || base.scope,
      appliesTo: base.appliesTo,
      workforceRole: base.workforceRole,
    });
    return mapTemplate(res && typeof res === "object" ? res : { ...base, status: "published" }, 0);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/rider/shifts/${id}`).catch(async () => {
      await api.put(`/api/v1/rider/shifts/${id}`, { status: "cancelled" });
    });
  },

  async listLiveWorkforce(): Promise<LiveShiftWorker[]> {
    const res = await api.get<unknown>("/api/v1/admin/picker/shift-assignments/live");
    if (res && typeof res === "object" && Array.isArray((res as { items?: unknown }).items)) {
      return ((res as { items: Record<string, unknown>[] }).items).map(mapLiveWorker);
    }
    return extractList(res).map(mapLiveWorker);
  },
};
