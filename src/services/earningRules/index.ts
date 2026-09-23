import { mockEarningRuleService } from "@/services/earningRules/earningRuleService.mock";
import { realEarningRuleService } from "@/services/earningRules/earningRuleService.real";
import type { EarningRuleService } from "@/services/earningRules/earningRuleService";

import { USE_MOCKS } from "@/lib/useMocks";

export const earningRuleService: EarningRuleService = USE_MOCKS ? mockEarningRuleService : realEarningRuleService;
