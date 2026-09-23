import { api } from "@/lib/apiClient";
import type { ShiftTemplate } from "@/types/workforce";
import type { Badge } from "@/types/common";
import type { ShiftsService } from "./shiftsService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "shifts", "templates"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "active").toLowerCase();
  if (s.includes("draft")) return { label: "Draft", tone: "grey" };
  if (s.includes("retir") || s.includes("inactive") || s.includes("archiv")) return { label: "Retired", tone: "grey" };
  return { label: "Active", tone: "green" };
}

function mapTemplate(raw: Record<string, unknown>, index: number): ShiftTemplate {
  const appliesRaw = String(raw.appliesTo ?? raw.workforce ?? raw.role ?? raw.type ?? "Picker").toLowerCase();
  const appliesTo: "Picker" | "Rider" = appliesRaw.includes("rider") ? "Rider" : "Picker";
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
    headcountTarget: String(raw.headcountTarget ?? raw.headcount ?? raw.target ?? "—"),
    scope: String(raw.scope ?? raw.store ?? raw.stores ?? raw.city ?? "All stores"),
    status: statusBadge(raw.status),
  };
}

export const realShiftsService: ShiftsService = {
  async list(): Promise<ShiftTemplate[]> {
    const res = await api.get<unknown>("/api/v1/warehouse/staff/shifts");
    return extractList(res).map(mapTemplate);
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
    const res = await api.post<Record<string, unknown>>("/api/v1/warehouse/staff/shifts", {
      ...input,
      status: "draft",
    });
    return mapTemplate(res && typeof res === "object" ? res : { ...input, status: "draft" }, 0);
  },

  async activate(id: string): Promise<ShiftTemplate> {
    const res = await api.put<Record<string, unknown>>(`/api/v1/warehouse/staff/shifts/${id}`, { status: "active" });
    return mapTemplate(res && typeof res === "object" ? res : { id, status: "active" }, 0);
  },

  async update(
    id: string,
    patch: Partial<Pick<ShiftTemplate, "hours" | "days" | "breakTime" | "headcountTarget" | "name">>,
  ): Promise<ShiftTemplate> {
    const res = await api.put<Record<string, unknown>>(`/api/v1/warehouse/staff/shifts/${id}`, patch);
    return mapTemplate(res && typeof res === "object" ? { id, ...patch, ...res } : { id, ...patch }, 0);
  },

  async duplicate(id: string): Promise<ShiftTemplate> {
    const existing = await api.get<Record<string, unknown>>(`/api/v1/warehouse/staff/shifts/${id}`);
    const base = existing && typeof existing === "object" ? existing : { id };
    const res = await api.post<Record<string, unknown>>("/api/v1/warehouse/staff/shifts", {
      ...base,
      id: undefined,
      _id: undefined,
      name: `${String(base.name ?? "Shift")} (copy)`,
      status: "draft",
    });
    return mapTemplate(res && typeof res === "object" ? res : { ...base, status: "draft" }, 0);
  },

  async remove(id: string): Promise<void> {
    await api.put(`/api/v1/warehouse/staff/shifts/${id}`, { status: "inactive" });
  },
};
