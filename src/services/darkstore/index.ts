import { realPickingService } from "@/services/darkstore/pickingService.real";
import type { PickingService } from "@/services/darkstore/pickingService";
import { realBagsService } from "@/services/darkstore/bagsService.real";
import type { BagsService } from "@/services/darkstore/bagsService";

export const pickingService: PickingService = realPickingService;
export const bagsService: BagsService = realBagsService;
