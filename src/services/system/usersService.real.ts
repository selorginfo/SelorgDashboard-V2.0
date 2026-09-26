import { api } from "@/lib/apiClient";
import type { SystemUser } from "@/types/system";
import type {
  UsersService,
  AdminUserInput,
  OtpSentResult,
  OtpVerifiedResult,
  PasswordResetResult,
  UserUpdateInput,
} from "./usersService";

function unwrapUser(res: unknown): SystemUser {
  const root = res as Record<string, unknown>;
  const data = (root?.["data"] ?? root) as SystemUser;
  return data;
}

export const realUsersService: UsersService = {
  async list(): Promise<SystemUser[]> {
    const res = await api.get<{ data?: SystemUser[]; list?: SystemUser[] } | SystemUser[]>("/api/v1/admin/users");
    if (Array.isArray(res)) return res;
    const r = res as { data?: SystemUser[]; list?: SystemUser[] };
    return r.data ?? r.list ?? [];
  },

  async setActive(id: string, active: boolean): Promise<SystemUser> {
    return api.put<SystemUser>(`/api/v1/admin/users/${id}`, { status: active ? "active" : "inactive" });
  },

  async create(input: AdminUserInput): Promise<SystemUser> {
    return api.post<SystemUser>("/api/v1/admin/users", input);
  },

  async sendOtp(email: string): Promise<OtpSentResult> {
    return api.post<OtpSentResult>("/api/v1/admin/users/verification/send-otp", { email });
  },

  async verifyOtp(email: string, otp: string, verificationRequestId: string): Promise<OtpVerifiedResult> {
    return api.post<OtpVerifiedResult>("/api/v1/admin/users/verification/verify-otp", {
      email,
      otp,
      verificationRequestId,
    });
  },

  async resetPassword(id: string, sendEmail = true): Promise<PasswordResetResult> {
    const res = await api.put<unknown>(`/api/v1/admin/users/${id}/reset-password`, { sendEmail });
    const root = res as Record<string, unknown>;
    const data = (root?.["data"] ?? root) as PasswordResetResult;
    return data;
  },

  async assignRole(
    id: string,
    roleId: string,
    opts?: { assignedStores?: string[]; primaryStoreId?: string }
  ): Promise<SystemUser> {
    const res = await api.put<unknown>(`/api/v1/admin/users/${id}/role`, {
      roleId,
      assignedStores: opts?.assignedStores,
      primaryStoreId: opts?.primaryStoreId,
    });
    return unwrapUser(res);
  },

  async update(id: string, input: UserUpdateInput): Promise<SystemUser> {
    const res = await api.put<unknown>(`/api/v1/admin/users/${id}`, input);
    return unwrapUser(res);
  },
};
