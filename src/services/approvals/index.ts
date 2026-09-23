import { mockApprovalService } from "@/services/approvals/approvalService.mock";
import { realApprovalService } from "@/services/approvals/approvalService.real";
import type { ApprovalService } from "@/services/approvals/approvalService";

import { USE_MOCKS } from "@/lib/useMocks";

export const approvalService: ApprovalService = USE_MOCKS ? mockApprovalService : realApprovalService;
