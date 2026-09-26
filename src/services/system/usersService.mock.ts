import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_SYSTEM_USERS } from "@/services/system/usersSeed";
import type { SystemUser } from "@/types/system";
import type {
  UsersService,
  AdminUserInput,
  OtpSentResult,
  OtpVerifiedResult,
  PasswordResetResult,
  UserUpdateInput,
} from "@/services/system/usersService";

const table = createMockTable<SystemUser>("selorg.system.users", SEED_SYSTEM_USERS);

function find(id: string): SystemUser {
  const user = table.all().find((u) => u.id === id);
  if (!user) throw new MockApiError(`User ${id} not found`);
  return user;
}

export const mockUsersService: UsersService = {
  async list() {
    await mockDelay();
    return table.all();
  },

  async setActive(id, active) {
    await mockDelay(220);
    let updated: SystemUser | undefined;
    table.update((rows) =>
      rows.map((u) => {
        if (u.id !== id) return u;
        updated = {
          ...u,
          accountStatus: active ? "active" : "deactivated",
          status: active ? { label: "Active", tone: "green" } : { label: "Deactivated", tone: "grey" },
          flagged: false,
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`User ${id} not found`);
    return updated;
  },

  async create(input: AdminUserInput): Promise<SystemUser> {
    await mockDelay(300);
    const newUser: SystemUser = {
      id: `usr-${Date.now()}`,
      name: input.name,
      email: input.email,
      role: input.roleId ?? "admin",
      scope: input.assignedStores?.join(", ") || (input.primaryStoreId ? input.primaryStoreId : "Global"),
      moduleCount: "0",
      sensitiveRights: "None",
      lastLogin: "Never",
      twoFactor: "Off",
      accountStatus: "active",
      flagged: false,
      status: { label: "Active", tone: "green" },
    };
    table.update((rows) => [...rows, newUser]);
    return newUser;
  },

  async sendOtp(_email: string): Promise<OtpSentResult> {
    await mockDelay(200);
    return {
      verificationRequestId: `mock-vr-${Date.now()}`,
      expiresAt: new Date(Date.now() + 600_000).toISOString(),
      devOtp: "123456",
    };
  },

  async verifyOtp(email: string, otp: string, _verificationRequestId: string): Promise<OtpVerifiedResult> {
    await mockDelay(200);
    if (otp !== "123456") throw new MockApiError("Invalid OTP. Use 123456 in mock mode.");
    return { emailVerifiedToken: `mock-token-${Date.now()}`, email };
  },

  async resetPassword(id: string, sendEmail = true): Promise<PasswordResetResult> {
    await mockDelay(200);
    find(id);
    return {
      newPassword: sendEmail ? undefined : "TempPass123!",
      message: "Password has been reset",
      emailSent: sendEmail,
    };
  },

  async assignRole(
    id: string,
    roleId: string,
    opts?: { assignedStores?: string[]; primaryStoreId?: string }
  ): Promise<SystemUser> {
    await mockDelay(200);
    let updated: SystemUser | undefined;
    table.update((rows) =>
      rows.map((u) => {
        if (u.id !== id) return u;
        updated = {
          ...u,
          role: roleId,
          ...(opts?.assignedStores ? { scope: opts.assignedStores.join(", ") || "Global" } : {}),
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`User ${id} not found`);
    return updated;
  },

  async update(id: string, input: UserUpdateInput): Promise<SystemUser> {
    await mockDelay(200);
    let updated: SystemUser | undefined;
    table.update((rows) =>
      rows.map((u) => {
        if (u.id !== id) return u;
        updated = {
          ...u,
          ...(input.roleId ? { role: input.roleId } : {}),
          ...(input.assignedStores ? { scope: input.assignedStores.join(", ") || "Global" } : {}),
          ...(input.twoFactorEnabled !== undefined
            ? { twoFactor: input.twoFactorEnabled ? ("On" as const) : ("Off" as const), flagged: !input.twoFactorEnabled }
            : {}),
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`User ${id} not found`);
    return updated;
  },
};
