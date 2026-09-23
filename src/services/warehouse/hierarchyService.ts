import { api } from "@/lib/apiClient";
import type { WhZone } from "@/types/warehouse";

function extract(res: unknown): unknown[] {
  if (Array.isArray(res)) return res;
  const r = res as Record<string, unknown>;
  return (r["data"] ?? r["list"] ?? r["zones"] ?? []) as unknown[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toZone(z: any): WhZone {
  return {
    zone: String(z["name"] ?? z["zone"] ?? z["zoneName"] ?? "Zone"),
    desc: String(z["description"] ?? z["desc"] ?? z["type"] ?? ""),
    cap: Number(z["capacity"] ?? z["cap"] ?? z["totalBins"] ?? 0),
    used: Number(z["used"] ?? z["usedBins"] ?? z["occupiedBins"] ?? 0),
    racks: Array.isArray(z["racks"]) ? z["racks"].map((r: any) => ({
      id: String(r["id"] ?? r["_id"] ?? r["rackId"] ?? ""),
      bins: Number(r["bins"] ?? r["totalBins"] ?? r["capacity"] ?? 0),
      used: Number(r["used"] ?? r["usedBins"] ?? r["occupied"] ?? 0),
      skus: Number(r["skus"] ?? r["distinctSkus"] ?? r["skuCount"] ?? 0),
      note: String(r["note"] ?? r["description"] ?? ""),
    })) : [],
  };
}

export async function fetchWarehouseZones(): Promise<WhZone[]> {
  try {
    const res = await api.get<unknown>("/api/v1/warehouse/utilities/zones");
    return extract(res).map(toZone);
  } catch {
    return [];
  }
}
