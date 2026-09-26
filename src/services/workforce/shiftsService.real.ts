import { api } from "@/lib/apiClient";
import type { ShiftTemplate } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { ShiftsService } from "./shiftsService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "shifts", "templates", "slots"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  // Nested { data: { items } } already unwrapped by api client in some paths
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
    breakTime: String(raw.breakTime ?? raw.break ?? "30 min"),
    headcountTarget: String(raw.headcountTarget ?? raw.headcount ?? raw.capacity ?? raw.target ?? "—"),
    scope: String(raw.scope ?? raw.store ?? raw.stores ?? raw.hub ?? raw.hubName ?? raw.city ?? "All stores"),
    status: statusBadge(raw.status),
  };
}

export const realShiftsService: ShiftsService = {
  async list(): Promise<ShiftTemplate[]> {
    // Rider App source of truth: picker_shifts via Admin rider shifts bridge
    const res = await api.get<unknown>("/api/v1/rider/shifts?limit=100");
    const list = extractList(res);
    if (list.length > 0) return list.map(mapTemplate);
    // Fallback warehouse staff (non-rider)
    const fallback = await api.get<unknown>("/api/v1/warehouse/staff/shifts").catch(() => []);
    return extractList(fallback).map(mapTemplate);
  },

  async create(input: {
    name: string;
    appliesTo: "Picker" | "Rider";
    hours: string;
    days: string;
    breakTime: string;
    headcountTarget: string;
    scope?: string;
  }): Promise<ShiftTemplate> {
    const [startTime, endTime] = String(input.hours)
      .split(/[–-]/)
      .map((s) => s.trim());
    const res = await api.post<Record<string, unknown>>("/api/v1/rider/shifts", {
      name: input.name,
      startTime: startTime || "09:00",
      endTime: endTime || "17:00",
      capacity: Number(input.headcountTarget) || 1,
      hubName: input.scope || "All stores",
      hubId: input.scope || undefined,
      status: "published",
      breakMinutes: parseInt(String(input.breakTime), 10) || 30,
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
    });
    return mapTemplate(res && typeof res === "object" ? res : { ...base, status: "published" }, 0);
  },

  async remove(id: string): Promise<void> {
    await api.delete(`/api/v1/rider/shifts/${id}`).catch(async () => {
      await api.put(`/api/v1/rider/shifts/${id}`, { status: "cancelled" });
    });
  },
};
