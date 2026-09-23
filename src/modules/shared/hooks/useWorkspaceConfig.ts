import { useQuery } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspace";
import type { ModuleId } from "@/constants/nav";

export function useWorkspaceConfig(moduleId: ModuleId) {
  return useQuery({
    queryKey: ["workspace-config", moduleId],
    queryFn: () => workspaceService.getConfig(moduleId),
  });
}
