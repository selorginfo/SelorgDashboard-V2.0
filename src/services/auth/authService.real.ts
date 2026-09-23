import { api } from "@/lib/apiClient";
import type { AdminUser, Role } from "@/types/auth";
import type { AuthService, LoginRequest, LoginResult } from "@/services/auth/authService";

interface LoginApiResponse {
  token: string;
  user: {
    id?: string;
    _id?: string;
    name?: string;
    email: string;
    role: string;
    permissions?: string[];
    assignedStores?: string[];
    primaryStoreId?: string;
  };
}

/** Mirror of the backend's `normalizeRoleKey` (src/config/permissions.ts). */
function normalizeRoleKey(role: string): string {
  return String(role ?? "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

/**
 * Backend role key → dashboard role. Keys cover both the dashboard's own role names and the
 * backend's `ROLE_DEFAULT_PERMISSIONS` keys, so a token minted by either side resolves.
 *
 * An unrecognised role is NOT silently upgraded — see `mapRole`. Operator roles that belong to
 * the mobile apps (`picker`, `rider` as a workforce login, `hhd`) are intentionally absent:
 * they must not be able to open the admin dashboard.
 */
const ROLE_MAP: Record<string, Role> = {
  super_admin: "Super Admin",
  superadmin: "Super Admin",
  admin: "Super Admin",
  operations_admin: "Operations Admin",
  operations: "Operations Admin",
  warehouse_manager: "Warehouse Manager",
  warehouse_ops: "Warehouse Manager",
  warehouse: "Warehouse Manager",
  dark_store_manager: "Dark Store Manager",
  darkstore: "Dark Store Manager",
  store_manager: "Dark Store Manager",
  rider_manager: "Rider Manager",
  rider_ops: "Rider Manager",
  customer_support: "Customer Support",
  support_agent: "Customer Support",
  support: "Customer Support",
  finance_admin: "Finance Admin",
  finance: "Finance Admin",
  catalog_manager: "Catalog Manager",
  category_manager: "Catalog Manager",
  merch: "Catalog Manager",
};

/**
 * Resolve the backend role to a dashboard role, or throw.
 *
 * Previously an unknown role fell back to "Super Admin", which turned any unmapped or
 * mistyped backend role into a full-privilege dashboard session. Refusing the login is the
 * safe default: the dashboard's role drives which modules and actions are offered.
 */
function mapRole(role: string): Role {
  const mapped = ROLE_MAP[normalizeRoleKey(role)];
  if (!mapped) {
    throw new Error(
      `Your account role ("${role}") is not permitted to sign in to the admin dashboard. Contact an administrator.`
    );
  }
  return mapped;
}

export const realAuthService: AuthService = {
  async login({ email, password, role }: LoginRequest): Promise<LoginResult> {
    const result = await api.post<LoginApiResponse>("/api/v1/admin/auth/login", {
      email,
      password,
      role: role.toLowerCase().replace(/ /g, "_"),
    });
    // Token is set as HttpOnly cookie by the server — no manual storage needed
    const userId = String(result.user._id ?? result.user.id ?? "");
    const adminUser: AdminUser = {
      id: userId,
      name: result.user.name ?? email.split("@")[0] ?? email,
      email: result.user.email,
      role: mapRole(result.user.role),
      scope: "All",
      twoFactorEnabled: false,
      status: "active",
    };
    return { requiresOtp: false, email, user: adminUser };
  },

  // The backend has no admin OTP step — `login` above always resolves with `requiresOtp: false`,
  // so the OTP screen is unreachable in the real flow. Both calls fail loudly rather than
  // silently succeeding, so a future `requiresOtp: true` can't strand a user on a screen whose
  // "Resend code" button quietly does nothing.
  async verifyOtp(_email: string, _code: string, _role: Role): Promise<AdminUser> {
    throw new Error("Two-factor sign-in is not enabled for admin accounts. Please log in again.");
  },

  async resendOtp(_email: string): Promise<void> {
    throw new Error("Two-factor sign-in is not enabled for admin accounts.");
  },
};
