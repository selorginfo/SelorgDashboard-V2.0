import { mockExceptionsService } from "@/services/monitoring/exceptionsService.mock";
import { realExceptionsService } from "@/services/monitoring/exceptionsService.real";
import type { ExceptionsService } from "@/services/monitoring/exceptionsService";

import { USE_MOCKS } from "@/lib/useMocks";

export const exceptionsService: ExceptionsService = USE_MOCKS ? mockExceptionsService : realExceptionsService;
