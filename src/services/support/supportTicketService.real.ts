import { api } from "@/lib/apiClient";
import type { SupportTicket, SupportWorkerKind, TicketMessage } from "@/types/supportTicket";
import type { Badge } from "@/types/common";
import type { SupportTicketService } from "./supportTicketService";

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  if (!res || typeof res !== "object") return [];
  const r = res as Record<string, unknown>;
  for (const k of ["data", "list", "items", "tickets"]) {
    if (Array.isArray(r[k])) return r[k] as Record<string, unknown>[];
  }
  return [];
}

function statusBadge(raw: unknown): Badge {
  if (raw && typeof raw === "object" && "label" in (raw as object)) return raw as Badge;
  const s = String(raw ?? "open").toLowerCase();
  if (s.includes("resolv")) return { label: "Resolved", tone: "green" };
  if (s.includes("escal")) return { label: "Escalated", tone: "red" };
  if (s.includes("wait")) return { label: "Waiting on rider", tone: "amber" };
  if (s.includes("investigat") || s.includes("progress")) return { label: "Investigating", tone: "blue" };
  if (s.includes("clos")) return { label: "Closed", tone: "grey" };
  return { label: "Open", tone: "amber" };
}

function mapThread(raw: unknown): TicketMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m) => {
    const row = (m && typeof m === "object" ? m : {}) as Record<string, unknown>;
    return {
      from: String(row.from ?? row.author ?? row.agent ?? "Agent"),
      text: String(row.text ?? row.body ?? row.message ?? ""),
      time: String(row.time ?? row.createdAt ?? "—"),
      internal: Boolean(row.internal ?? row.isInternal),
    };
  });
}

function mapTicket(raw: Record<string, unknown>, index: number): SupportTicket {
  const priorityRaw = String(raw.priority ?? "P2").toUpperCase();
  const priority = priorityRaw === "HIGH" || priorityRaw === "P1" || priorityRaw === "1" ? "P1" : priorityRaw.startsWith("P") ? priorityRaw : "P2";
  return {
    id: String(raw.id ?? raw._id ?? raw.ticketId ?? `TKT-${index + 1}`),
    person: String(raw.person ?? raw.customerName ?? raw.riderName ?? raw.pickerName ?? raw.name ?? "Worker"),
    issue: String(raw.issue ?? raw.subject ?? raw.title ?? "Support request"),
    context: String(raw.context ?? raw.category ?? raw.store ?? "—"),
    priority,
    agent: String(raw.agent ?? raw.assignee ?? raw.assignedTo ?? "Unassigned"),
    age: String(raw.age ?? raw.createdAt ?? "—"),
    status: statusBadge(raw.status),
    thread: mapThread(raw.thread ?? raw.messages ?? raw.notes),
  };
}

function kindFilter(tickets: SupportTicket[], kind: SupportWorkerKind): SupportTicket[] {
  // Backend list may be shared; prefer kind tags when present, otherwise return all mapped tickets.
  return tickets;
}

export const realSupportTicketService: SupportTicketService = {
  async list(kind: SupportWorkerKind): Promise<SupportTicket[]> {
    const res = await api.get<unknown>("/api/v1/admin/support/tickets");
    return kindFilter(extractList(res).map(mapTicket), kind);
  },

  async reply(_kind: SupportWorkerKind, id: string, text: string, internal: boolean): Promise<SupportTicket> {
    const res = await api.post<Record<string, unknown>>(`/api/v1/admin/support/tickets/${id}/notes`, { text, internal });
    return mapTicket(res && typeof res === "object" ? res : { id }, 0);
  },

  async assignAgent(_kind: SupportWorkerKind, id: string, agent: string): Promise<SupportTicket> {
    const res = await api.post<Record<string, unknown>>(`/api/v1/admin/support/tickets/${id}/assign`, { agent });
    return mapTicket(res && typeof res === "object" ? { ...res, agent } : { id, agent }, 0);
  },

  async setStatus(_kind: SupportWorkerKind, id: string, status: SupportTicket["status"]): Promise<SupportTicket> {
    const res = await api.patch<Record<string, unknown>>(`/api/v1/admin/support/tickets/${id}`, {
      status: status.label,
      tone: status.tone,
    });
    return mapTicket(res && typeof res === "object" ? { ...res, status } : { id, status }, 0);
  },

  async create(
    kind: SupportWorkerKind,
    input: {
      subject: string;
      description?: string;
      category?: string;
      priority?: string;
      customerName: string;
      customerEmail: string;
    },
  ): Promise<SupportTicket> {
    const created = await api.post<unknown>("/api/v1/admin/support/tickets", {
      ...input,
      category: input.category || (kind === "picker" ? "scanner" : "earnings"),
      channel: "dashboard",
      tags: [kind],
    });
    const raw =
      created && typeof created === "object" && "data" in (created as object)
        ? ((created as { data: Record<string, unknown> }).data ?? (created as Record<string, unknown>))
        : (created as Record<string, unknown>);
    return mapTicket(raw && typeof raw === "object" ? raw : { issue: input.subject, person: input.customerName }, 0);
  },
};
