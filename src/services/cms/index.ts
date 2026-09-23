import { mockContentService } from "@/services/cms/contentService.mock";
import { realContentService } from "@/services/cms/contentService.real";
import type { ContentService } from "@/services/cms/contentService";
import { mockHomeSectionService } from "@/services/cms/homeSectionService.mock";
import { realHomeSectionService } from "@/services/cms/homeSectionService.real";
import type { HomeSectionService } from "@/services/cms/homeSectionService";
import { mockMediaService } from "@/services/cms/mediaService.mock";
import { realMediaService } from "@/services/cms/mediaService.real";
import type { MediaService } from "@/services/cms/mediaService";

import { USE_MOCKS } from "@/lib/useMocks";

export const contentService: ContentService = USE_MOCKS ? mockContentService : realContentService;
export const homeSectionService: HomeSectionService = USE_MOCKS ? mockHomeSectionService : realHomeSectionService;
export const mediaService: MediaService = USE_MOCKS ? mockMediaService : realMediaService;
