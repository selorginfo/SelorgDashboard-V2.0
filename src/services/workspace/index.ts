import { mockWorkspaceService } from "@/services/workspace/workspaceService.mock";
import { realWorkspaceService } from "@/services/workspace/workspaceService.real";
import type { WorkspaceService } from "@/services/workspace/workspaceService";

import { USE_MOCKS } from "@/lib/useMocks";

export const workspaceService: WorkspaceService = USE_MOCKS ? mockWorkspaceService : realWorkspaceService;
