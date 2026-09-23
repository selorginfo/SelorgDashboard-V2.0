import { mockDelay } from "@/services/mockDb";
import { WORKSPACE_CONFIGS } from "@/services/workspace/workspaceData";
import type { WorkspaceService } from "@/services/workspace/workspaceService";

export const mockWorkspaceService: WorkspaceService = {
  async getConfig(moduleId) {
    await mockDelay();
    return WORKSPACE_CONFIGS[moduleId] ?? null;
  },
};
