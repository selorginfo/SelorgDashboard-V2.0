import { mockAuthService } from "@/services/auth/authService.mock";
import { realAuthService } from "@/services/auth/authService.real";
import type { AuthService } from "@/services/auth/authService";

import { USE_MOCKS } from "@/lib/useMocks";

export const authService: AuthService = USE_MOCKS ? mockAuthService : realAuthService;
