import type { DashboardSnapshot } from "@/modules/dashboard/types";

export type DashboardRange = "24h" | "7d" | "30d" | "90d";

export interface DashboardService {
  getSnapshot(range?: DashboardRange): Promise<DashboardSnapshot>;
}
