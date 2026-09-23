import { mockCatalogService } from "@/services/catalog/catalogService.mock";
import { realCatalogService } from "@/services/catalog/catalogService.real";
import type { CatalogService } from "@/services/catalog/catalogService";
import { mockPromotionsService } from "@/services/catalog/promotionsService.mock";
import { realPromotionsService } from "@/services/catalog/promotionsService.real";
import type { PromotionsService } from "@/services/catalog/promotionsService";

import { USE_MOCKS } from "@/lib/useMocks";

export const catalogService: CatalogService = USE_MOCKS ? mockCatalogService : realCatalogService;
export const promotionsService: PromotionsService = USE_MOCKS ? mockPromotionsService : realPromotionsService;
