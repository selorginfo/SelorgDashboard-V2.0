import { mockRolesService } from "./rolesService.mock";
import { realRolesService } from "./rolesService.real";
import type { RolesService } from "./rolesService";
import { mockPermissionsService } from "./permissionsService.mock";
import { realPermissionsService } from "./permissionsService.real";
import type { PermissionsService } from "./permissionsService";

import { USE_MOCKS } from "@/lib/useMocks";

export const rolesService: RolesService = USE_MOCKS ? mockRolesService : realRolesService;
export const permissionsService: PermissionsService = USE_MOCKS
  ? mockPermissionsService
  : realPermissionsService;
