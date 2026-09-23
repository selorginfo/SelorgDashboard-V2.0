import { useQuery } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard";
import type { DashboardRange } from "@/services/dashboard/dashboardService";

export function useDashboard(range: DashboardRange = "24h") {
  return useQuery({
    queryKey: ["dashboard", "snapshot", range],
    queryFn: () => dashboardService.getSnapshot(range),
    refetchInterval: 60_000,
  });
}
