import type { AdminUser, Role } from "@/types/auth";
import { mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_ADMIN_USERS } from "@/services/auth/seed";
import type { AuthService, LoginRequest, LoginResult } from "@/services/auth/authService";

export const mockAuthService: AuthService = {
  async login({ email, password, role }: LoginRequest): Promise<LoginResult> {
    await mockDelay();
    if (!email || !password) {
      throw new MockApiError("Enter your work email and password.");
    }
    const matched = SEED_ADMIN_USERS.find(
      (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (matched && matched.role !== role) {
      throw new MockApiError(`${matched.name} is provisioned as ${matched.role}, not ${role}.`);
    }
    return { requiresOtp: true, email };
  },

  async verifyOtp(email: string, code: string, role: Role): Promise<AdminUser> {
    await mockDelay(320);
    if (!/^\d{6}$/.test(code)) {
      throw new MockApiError("Enter the 6-digit code from your authenticator app.");
    }
    const matched = SEED_ADMIN_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (matched) return matched;
    // Unrecognised work email — still lets the reviewer explore the prototype, scoped to
    // whatever role was picked on the login screen. Labelled "Guest" rather than deriving a name
    // from the typed email, which produced odd fragments (e.g. "company.commi…") in the topbar.
    return {
      id: "U-guest",
      name: "Guest",
      email,
      role,
      scope: "All",
      twoFactorEnabled: true,
      status: "active",
    };
  },

  async resendOtp(): Promise<void> {
    await mockDelay(200);
  },
};
