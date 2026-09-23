import type { SystemUser } from "@/types/system";

export interface AdminUserInput {
  name: string;
  email: string;
  password: string;
  department?: string;
  roleId?: string;
  emailVerifiedToken?: string;
}

export interface OtpSentResult {
  verificationRequestId: string;
  expiresAt: string;
  devOtp?: string;
}

export interface OtpVerifiedResult {
  emailVerifiedToken: string;
  email: string;
}

export interface PasswordResetResult {
  newPassword?: string;
  message: string;
  emailSent: boolean;
}

export interface UserUpdateInput {
  roleId?: string;
  assignedStores?: string[];
  primaryStoreId?: string;
  twoFactorEnabled?: boolean;
  notes?: string;
  status?: string;
}

export interface UsersService {
  list(): Promise<SystemUser[]>;
  setActive(id: string, active: boolean): Promise<SystemUser>;
  create(input: AdminUserInput): Promise<SystemUser>;
  sendOtp(email: string): Promise<OtpSentResult>;
  verifyOtp(email: string, otp: string, verificationRequestId: string): Promise<OtpVerifiedResult>;
  resetPassword(id: string, sendEmail?: boolean): Promise<PasswordResetResult>;
  assignRole(id: string, roleId: string): Promise<SystemUser>;
  update(id: string, input: UserUpdateInput): Promise<SystemUser>;
}
