import { mockSupportTicketService } from "@/services/support/supportTicketService.mock";
import { realSupportTicketService } from "@/services/support/supportTicketService.real";
import type { SupportTicketService } from "@/services/support/supportTicketService";

import { USE_MOCKS } from "@/lib/useMocks";

export const supportTicketService: SupportTicketService = USE_MOCKS ? mockSupportTicketService : realSupportTicketService;
