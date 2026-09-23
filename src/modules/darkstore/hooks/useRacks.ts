import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/apiClient";
import type { DsRack, DsRackStoreSummary } from "@/types/darkstore";
import type { Tone } from "@/types/common";

function tone(s?: string): Tone {
  const v = (s ?? "").toLowerCase();
  if (v.includes("active") || v.includes("ok") || v.includes("normal")) return "green";
  if (v.includes("full") || v.includes("near") || v.includes("capacity") || v.includes("critical")) return "amber";
  if (v.includes("inactive") || v.includes("off")) return "grey";
  return "green";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRack(r: any, i: number): DsRack {
  const cap = Number(r["capacity"] ?? r["slots"] ?? r["totalSlots"] ?? 20);
  const occ = Number(r["occupied"] ?? r["usedSlots"] ?? r["used"] ?? 0);
  return {
    id: String(r["id"] ?? r["_id"] ?? r["shelf_id"] ?? r["shelfId"] ?? `RACK-${i}`),
    barcode: String(r["barcode"] ?? r["location_code"] ?? r["code"] ?? "—"),
    store: String(r["store"] ?? r["darkStore"] ?? r["store_id"] ?? r["storeId"] ?? "—"),
    zone: String(r["zone"] ?? r["area"] ?? "—"),
    capacity: cap,
    occupied: occ,
    available: Math.max(0, cap - occ),
    status: { label: r["status"] ?? "Active", tone: tone(r["status"]) },
  };
}

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["shelves"] ?? r["racks"] ?? []) as unknown[];
}

export interface CreateRackInput {
  location_code: string;
  aisle: string;
  shelf_number: number;
  zone: string;
  section?: string;
}

export function useRacks() {
  return useQuery({
    queryKey: ["darkstore-racks"],
    queryFn: async (): Promise<DsRack[]> => {
      const res = await api.get<unknown>("/api/v1/darkstore/inventory/shelves");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return extract(res).map((r: any, i) => toRack(r, i));
    },
    staleTime: 60_000,
  });
}

export function useCreateRack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateRackInput) => {
      const res = await api.post<unknown>("/api/v1/darkstore/inventory/shelves", input);
      const root = res as Record<string, unknown>;
      const data = (root["data"] ?? root) as Record<string, unknown>;
      return toRack(data, 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["darkstore-racks"] });
      queryClient.invalidateQueries({ queryKey: ["darkstore-rack-store-summaries"] });
    },
  });
}

export function useUpdateRack() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shelfId,
      status,
      occupied,
    }: {
      shelfId: string;
      status?: string;
      occupied?: number;
    }) => {
      const res = await api.put<unknown>(`/api/v1/darkstore/inventory/shelves/${encodeURIComponent(shelfId)}`, {
        ...(status != null ? { status } : {}),
        ...(occupied != null ? { occupied } : {}),
      });
      const root = res as Record<string, unknown>;
      return toRack((root["data"] ?? root) as Record<string, unknown>, 0);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["darkstore-racks"] });
      queryClient.invalidateQueries({ queryKey: ["darkstore-rack-store-summaries"] });
    },
  });
}

export function useRackStoreSummaries() {
  return useQuery({
    queryKey: ["darkstore-rack-store-summaries"],
    queryFn: async (): Promise<DsRackStoreSummary[]> => {
      const res = await api.get<unknown>("/api/v1/darkstore/inventory/shelves");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const racks: DsRack[] = extract(res).map((r: any, i) => toRack(r, i));
      const byStore = new Map<string, DsRack[]>();
      for (const r of racks) {
        const list = byStore.get(r.store) ?? [];
        list.push(r);
        byStore.set(r.store, list);
      }
      return Array.from(byStore.entries()).map(([store, storeRacks]) => ({
        store,
        rackCount: `${storeRacks.length} racks`,
        zones: [...new Set(storeRacks.map((r) => r.zone))].join(", "),
        capacity: storeRacks.reduce((s, r) => s + r.capacity, 0),
        occupied: storeRacks.reduce((s, r) => s + r.occupied, 0),
        available: storeRacks.reduce((s, r) => s + r.available, 0),
        status: { label: "Active", tone: "green" as Tone },
      }));
    },
    staleTime: 60_000,
  });
}
