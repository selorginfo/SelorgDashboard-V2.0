import { mockDirectoryService } from "@/services/workforce/directoryService.mock";
import { realDirectoryService } from "@/services/workforce/directoryService.real";
import type { DirectoryService } from "@/services/workforce/directoryService";
import { mockEarningsService } from "@/services/workforce/earningsService.mock";
import { realEarningsService } from "@/services/workforce/earningsService.real";
import type { EarningsService } from "@/services/workforce/earningsService";
import { mockPayoutsService } from "@/services/workforce/payoutsService.mock";
import { realPayoutsService } from "@/services/workforce/payoutsService.real";
import type { PayoutsService } from "@/services/workforce/payoutsService";
import { mockShiftsService } from "@/services/workforce/shiftsService.mock";
import { realShiftsService } from "@/services/workforce/shiftsService.real";
import type { ShiftsService } from "@/services/workforce/shiftsService";
import { mockRosterService } from "@/services/workforce/rosterService.mock";
import { realRosterService } from "@/services/workforce/rosterService.real";
import type { RosterService } from "@/services/workforce/rosterService";

import { USE_MOCKS } from "@/lib/useMocks";

export const directoryService: DirectoryService = USE_MOCKS ? mockDirectoryService : realDirectoryService;
export const earningsService: EarningsService = USE_MOCKS ? mockEarningsService : realEarningsService;
export const payoutsService: PayoutsService = USE_MOCKS ? mockPayoutsService : realPayoutsService;
export const shiftsService: ShiftsService = USE_MOCKS ? mockShiftsService : realShiftsService;
export const rosterService: RosterService = USE_MOCKS ? mockRosterService : realRosterService;
