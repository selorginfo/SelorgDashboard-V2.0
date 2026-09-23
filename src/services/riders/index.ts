import { mockRidersService } from "./ridersService.mock";
import { realRidersService } from "./ridersService.real";
import type { RidersService } from "./ridersService";

import { USE_MOCKS } from "@/lib/useMocks";

export const ridersService: RidersService = USE_MOCKS ? mockRidersService : realRidersService;
