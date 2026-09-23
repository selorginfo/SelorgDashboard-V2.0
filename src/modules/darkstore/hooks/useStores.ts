import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { DarkStoreCard } from "@/types/darkstore";
import type { Tone } from "@/types/common";

function statusTone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("active") || v.includes("open")) return "green";
  if (v.includes("risk") || v.includes("warn")) return "amber";
  if (v.includes("inactive") || v.includes("closed")) return "red";
  return "green";
}

function inventoryTone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("low")) return "red";
  if (v.includes("medium") || v.includes("ok")) return "amber";
  return "green";
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["stores"] ?? []) as unknown[];
}

/** Raw DarkStore record from the backend `dark_stores` collection. */
export interface DarkStoreRecord {
  _id: string;
  name: string;
  code: string;
  warehouseId?: string | null;
  location: { type: "Point"; coordinates: [number, number] }; // [lng, lat]
  address: { line1: string; line2: string; city: string; state: string; pincode: string };
  serviceRadius: number;
  isActive: boolean;
  operatingHours: { open: string; close: string };
  avgPickPackTime: number;
  contactPhone: string;
}

export interface DarkStoreInput {
  name: string;
  code: string;
  warehouseId?: string | null;
  location: { type: "Point"; coordinates: [number, number] };
  address: DarkStoreRecord["address"];
  serviceRadius: number;
  isActive: boolean;
  operatingHours: { open: string; close: string };
  avgPickPackTime: number;
  contactPhone: string;
}

const QUERY_KEY = ["darkstore-stores"] as const;

function toCard(s: DarkStoreRecord): DarkStoreCard {
  // Capacity / live order / inventory health are not on the darkstores document —
  // never invent "0%" or "OK". Show unknown until a dedicated metrics API exists.
  return {
    id: s._id,
    store: s.name || s.code || "Store",
    manager: "—",
    hours: `${s.operatingHours?.open ?? "—"} – ${s.operatingHours?.close ?? "—"}`,
    capacityPct: -1,
    activeOrders: "—",
    pickers: "—",
    inventory: { label: "—", tone: "grey" },
    status: { label: s.isActive ? "Active" : "Inactive", tone: statusTone(s.isActive ? "active" : "inactive") },
  };
}

export function useStores() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<DarkStoreCard[]> => {
      try {
        const res = await api.get<unknown>("/api/v1/admin/darkstores");
        const raw = extract(res) as DarkStoreRecord[];
        return raw.map(toCard);
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });
}

/** Returns raw store records (with location, radius, etc.) for the editor. */
export function useStoreRecords() {
  return useQuery({
    queryKey: [...QUERY_KEY, "records"],
    queryFn: async (): Promise<DarkStoreRecord[]> => {
      const res = await api.get<unknown>("/api/v1/admin/darkstores");
      return extract(res) as DarkStoreRecord[];
    },
    staleTime: 60_000,
  });
}

export function useCreateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: DarkStoreInput) => api.post<{ data: DarkStoreRecord }>("/api/v1/admin/darkstores", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, "records"] });
    },
  });
}

export function useUpdateStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DarkStoreInput> }) =>
      api.put<{ data: DarkStoreRecord }>(`/api/v1/admin/darkstores/${id}`, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, "records"] });
    },
  });
}

export function useDeleteStore() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete<{ success: boolean }>(`/api/v1/admin/darkstores/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: [...QUERY_KEY, "records"] });
    },
  });
}
