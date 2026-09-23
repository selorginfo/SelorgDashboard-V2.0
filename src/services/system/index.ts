import { mockUsersService } from "@/services/system/usersService.mock";
import { realUsersService } from "@/services/system/usersService.real";
import type { UsersService } from "@/services/system/usersService";
import { mockSettingsService } from "@/services/system/settingsService.mock";
import { realSettingsService } from "@/services/system/settingsService.real";
import type { SettingsService } from "@/services/system/settingsService";

import { USE_MOCKS } from "@/lib/useMocks";

export const usersService: UsersService = USE_MOCKS ? mockUsersService : realUsersService;
export const settingsService: SettingsService = USE_MOCKS ? mockSettingsService : realSettingsService;
