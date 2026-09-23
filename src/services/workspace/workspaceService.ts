import type { WorkspaceConfig } from "@/types/common";
import type { ModuleId } from "@/constants/nav";

export interface WorkspaceService {
  getConfig(moduleId: ModuleId): Promise<WorkspaceConfig | null>;
}
