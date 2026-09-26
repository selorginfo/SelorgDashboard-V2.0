import { USE_MOCKS } from "@/lib/useMocks";
import { mockOpsService } from "./opsService";
import { realOpsService } from "./opsService.real";

export const opsService = USE_MOCKS ? mockOpsService : realOpsService;
export type { ApplyActionInput, SaveRecordInput, OpsService } from "./opsService";
