import { USE_MOCKS } from "@/lib/useMocks";
import { mockBulkOrderService } from "./bulkOrderService";
import { realBulkOrderService } from "./bulkOrderService.real";

export const bulkOrderService = USE_MOCKS ? mockBulkOrderService : realBulkOrderService;
export { bulkOrderTotals } from "./bulkOrderService";
