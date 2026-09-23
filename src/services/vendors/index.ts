import { mockVendorService } from "@/services/vendors/vendorService.mock";
import { realVendorService } from "@/services/vendors/vendorService.real";
import type { VendorService } from "@/services/vendors/vendorService";

import { USE_MOCKS } from "@/lib/useMocks";

export const vendorService: VendorService = USE_MOCKS ? mockVendorService : realVendorService;
