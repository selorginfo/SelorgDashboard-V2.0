import { api } from "@/lib/apiClient";
import type { Transfer } from "@/types/warehouse";
import type { TransferService, CreateTransferInput } from "./transferService";
import { toneForStatus } from "./transferStatus";

const BASE = "/api/v1/warehouse/transfers";

function mapTransfer(raw: Record<string, unknown>): Transfer {
  const statusLabel = String(raw["status"] ?? "Pending");
  const pretty =
    statusLabel === "pending"
      ? "Requested"
      : statusLabel === "loading"
        ? "Approved"
        : statusLabel === "en-route"
          ? "Dispatched"
          : statusLabel === "completed"
            ? "Received"
            : statusLabel;
  return {
    id: String(raw["id"] ?? raw["_id"] ?? raw["transferId"] ?? "—"),
    toStore: String(raw["destination"] ?? raw["toStore"] ?? "—"),
    priority: String(raw["priority"] ?? "Normal"),
    requested: raw["requestedAt"]
      ? new Date(String(raw["requestedAt"])).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
      : "—",
    approved: String(raw["approved"] ?? "—"),
    dispatched: String(raw["dispatched"] ?? "—"),
    received: String(raw["received"] ?? raw["items"] ?? "—"),
    status: { label: pretty, tone: toneForStatus(pretty) },
  };
}

function extractList(res: unknown): Record<string, unknown>[] {
  if (Array.isArray(res)) return res as Record<string, unknown>[];
  const r = res as Record<string, unknown>;
  const data = r["data"] ?? r["list"] ?? [];
  return Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
}

export const realTransferService: TransferService = {
  async list(): Promise<Transfer[]> {
    const res = await api.get<unknown>(BASE);
    return extractList(res).map(mapTransfer);
  },

  async advance(id: string): Promise<Transfer> {
    const res = await api.put<unknown>(`${BASE}/${id}/status`, { action: "advance" });
    const root = res as Record<string, unknown>;
    return mapTransfer((root["data"] ?? root) as Record<string, unknown>);
  },

  async create(input: CreateTransferInput): Promise<Transfer> {
    const res = await api.post<unknown>(BASE, {
      destination: input.destination,
      origin: input.origin || "Current Warehouse",
      items: Math.max(1, Number(input.items) || 1),
    });
    const root = res as Record<string, unknown>;
    return mapTransfer((root["data"] ?? root) as Record<string, unknown>);
  },
};
