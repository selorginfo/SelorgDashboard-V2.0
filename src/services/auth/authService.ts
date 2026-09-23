import type { AdminUser, Role } from "@/types/auth";

export interface LoginRequest {
  email: string;
  password: string;
  role: Role;
}

export interface LoginResult {
  requiresOtp: boolean;
  email: string;
  user?: AdminUser;
}

export interface AuthService {
  login(req: LoginRequest): Promise<LoginResult>;
  verifyOtp(email: string, code: string, role: Role): Promise<AdminUser>;
  resendOtp(email: string): Promise<void>;
}
