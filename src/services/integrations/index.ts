import { mockIntegrationService } from "@/services/integrations/integrationService.mock";
import { realIntegrationService } from "@/services/integrations/integrationService.real";
import type { IntegrationService } from "@/services/integrations/integrationService";

import { USE_MOCKS } from "@/lib/useMocks";

export const integrationService: IntegrationService = USE_MOCKS ? mockIntegrationService : realIntegrationService;
