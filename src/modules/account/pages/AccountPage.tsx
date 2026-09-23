import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { api } from "@/lib/apiClient";
import { passwordSchema, type PasswordFormValues } from "@/modules/account/passwordSchema";
import { useNotificationPrefs, useUpdateNotificationPrefs } from "@/modules/account/hooks/useNotificationPrefs";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/EmptyState";
import { NOTIFICATION_PREF_ITEMS } from "@/types/account";
import type { NotificationPrefKey } from "@/types/account";
import styles from "./AccountPage.module.css";

const TABS = ["Profile", "Security", "Notifications", "Sessions", "Appearance"];

const SECURITY_ROWS = [
  { label: "Password", value: "Changed 22 days ago", action: "Change password", tone: "grey" as const },
  { label: "Two-factor authentication", value: "Authenticator app · enabled", action: "Reconfigure", tone: "green" as const },
  { label: "Backup codes", value: "3 of 10 remaining", action: "Regenerate", tone: "amber" as const },
  { label: "Login alerts", value: "Email on new device", action: "Edit", tone: "green" as const },
  { label: "Session timeout", value: "30 minutes idle", action: "Edit", tone: "grey" as const },
];

const SESSIONS = [
  { dev: "MacBook Pro · Chrome", meta: "Bengaluru · 10.2.1.04 · current session", when: "Active now", current: true },
  { dev: "iPhone 14 · Selorg Admin", meta: "Bengaluru · 4G", when: "2 hours ago", current: false },
  { dev: "Windows PC · Edge", meta: "Bengaluru · 10.2.1.19", when: "Yesterday 21:40", current: false },
  { dev: "iPad · Safari", meta: "Mysuru · Wi-Fi", when: "18 Aug", current: false },
];

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function AccountPage() {
  const user = useSessionStore((s) => s.user);
  const logout = useSessionStore((s) => s.logout);
  const pushToast = useUiStore((s) => s.pushToast);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const sidebarExpanded = useUiStore((s) => s.sidebarExpanded);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const density = useUiStore((s) => s.density);
  const setDensity = useUiStore((s) => s.setDensity);
  const defaultLanding = useUiStore((s) => s.defaultLanding);
  const setDefaultLanding = useUiStore((s) => s.setDefaultLanding);
  const { data: prefs, isLoading, isError, refetch } = useNotificationPrefs();
  const updatePrefs = useUpdateNotificationPrefs();
  const [tab, setTab] = useState(TABS[0] as string);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmitPassword(_values: PasswordFormValues) {
    const userId = user?.id;
    if (!userId) {
      pushToast("No signed-in user id — cannot reset password", "error");
      return;
    }
    try {
      // Admin directory reset mints a temporary password (optional email).
      const result = await api.put<{ temporaryPassword?: string; password?: string }>(
        `/api/v1/admin/users/${encodeURIComponent(userId)}/reset-password`,
        { sendEmail: false }
      );
      const temp =
        (result as { temporaryPassword?: string })?.temporaryPassword ||
        (result as { password?: string })?.password;
      reset();
      setPasswordDialogOpen(false);
      pushToast(
        temp
          ? `Temporary password issued: ${temp} — sign in again with it, then rotate via Users.`
          : "Password reset issued — check email or ask a Super Admin for the temporary password.",
        "success"
      );
    } catch (err) {
      pushToast((err as Error).message || "Couldn't reset password", "error");
    }
  }

  function toggleChannel(key: NotificationPrefKey) {
    if (!prefs) return;
    updatePrefs.mutate(
      { ...prefs, [key]: !prefs[key] },
      { onSuccess: () => pushToast("Preference saved", "success") }
    );
  }

  async function securityAction(row: (typeof SECURITY_ROWS)[number]) {
    if (row.action === "Change password") {
      setPasswordDialogOpen(true);
      return;
    }
    const userId = user?.id;
    try {
      if (row.action === "Reconfigure") {
        if (!userId) throw new Error("No signed-in user id");
        const enabled = !user?.twoFactorEnabled;
        await api.put(`/api/v1/admin/users/${encodeURIComponent(userId)}`, { twoFactorEnabled: enabled });
        pushToast(enabled ? "Two-factor authentication enabled" : "Two-factor authentication disabled", "success");
        return;
      }
      if (row.action === "Regenerate") {
        pushToast("Backup codes are managed by your identity provider — ask a Super Admin to rotate them", "info");
        return;
      }
      if (row.label === "Login alerts") {
        setTab("Notifications");
        pushToast("Edit login alert preferences under Notifications", "info");
        return;
      }
      if (row.label === "Session timeout") {
        const minutesRaw = window.prompt("Session timeout (minutes)", "30");
        if (minutesRaw == null) return;
        const minutes = Number(minutesRaw);
        if (!Number.isFinite(minutes) || minutes < 5) {
          pushToast("Enter a timeout of at least 5 minutes", "error");
          return;
        }
        await api.put("/api/v1/admin/system/advanced", { sessionTimeout: Math.round(minutes * 60) });
        pushToast(`Session timeout set to ${minutes} minutes`, "success");
        return;
      }
      pushToast(`${row.action} is not available`, "info");
    } catch (err) {
      pushToast((err as Error).message || `Couldn't complete ${row.action}`, "error");
    }
  }

  function appearanceAction(label: string) {
    if (label === "Theme") {
      setTheme(theme === "light" ? "dark" : "light");
      return;
    }
    if (label === "Sidebar") {
      toggleSidebar();
      return;
    }
    if (label === "Density") {
      const next = density === "comfortable" ? "compact" : "comfortable";
      setDensity(next);
      document.documentElement.dataset.density = next;
      pushToast(`Density set to ${next}`, "success");
      return;
    }
    if (label === "Default landing screen") {
      const next = window.prompt("Default landing path after login", defaultLanding || "/dashboard");
      if (next == null) return;
      const path = next.trim().startsWith("/") ? next.trim() : `/${next.trim()}`;
      setDefaultLanding(path || "/dashboard");
      pushToast(`Default landing set to ${path || "/dashboard"}`, "success");
      return;
    }
    pushToast(`${label} updated locally`, "info");
  }

  const displayName = user?.fullName ?? user?.name ?? "—";

  return (
    <div className={styles.wrap}>
      <Card className={styles.heroCard}>
        <span className={styles.avatar}>{user ? initials(displayName) : "—"}</span>
        <div className={styles.heroBody}>
          <div className={styles.heroName}>{displayName}</div>
          <div className={styles.heroContact}>
            {user?.email ?? "—"}
            {user?.phone ? ` · ${user.phone}` : ""}
          </div>
          <div className={styles.heroBadges}>
            {user ? <span className={styles.badgePill} data-tone="brand">{user.role}</span> : null}
            <span className={styles.badgePill}>All stores</span>
            <span className={styles.badgePill}>{user?.twoFactorEnabled ? "2FA enabled" : "2FA disabled"}</span>
          </div>
        </div>
        <Button
          variant="danger"
          onClick={() => {
            logout();
            pushToast("Signed out", "success");
          }}
        >
          Sign out
        </Button>
      </Card>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} type="button" className={styles.tabChip} data-active={t === tab} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>

      {tab === "Profile" ? (
        <Card className={styles.card}>
          <div className={styles.sectionTitle}>Profile</div>
          <div className={styles.profileGrid}>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Full name</span>
              <span className={styles.fieldValue}>{displayName}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Work email</span>
              <span className={styles.fieldValue}>{user?.email ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Phone</span>
              <span className={styles.fieldValue}>{user?.phone ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Role</span>
              <span className={styles.fieldValue}>{user?.role ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Scope</span>
              <span className={styles.fieldValue}>{user?.scopeLabel ?? user?.scope ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Employee ID</span>
              <span className={styles.fieldValue}>{user?.employeeId ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Reporting to</span>
              <span className={styles.fieldValue}>{user?.reportingTo ?? "—"}</span>
            </div>
            <div className={styles.field}>
              <span className={styles.fieldLabel}>Joined</span>
              <span className={styles.fieldValue}>{user?.joined ?? "—"}</span>
            </div>
          </div>
        </Card>
      ) : null}

      {tab === "Security" ? (
        <Card className={styles.card}>
          <div className={styles.sectionTitle}>Security</div>
          <div className={styles.rowList}>
            {SECURITY_ROWS.map((row) => (
              <div key={row.label} className={styles.settingRow}>
                <div className={styles.settingIdentity}>
                  <div className={styles.settingLabel}>{row.label}</div>
                  <div className={styles.settingValue}>{row.value}</div>
                </div>
                <Badge label={row.value} tone={row.tone} />
                <button type="button" className={styles.rowActionBtn} onClick={() => void securityAction(row)}>
                  {row.action}
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "Notifications" ? (
        <Card className={styles.card}>
          <div className={styles.sectionTitle}>Notification preferences</div>
          {isLoading ? (
            <CardSkeleton />
          ) : isError || !prefs ? (
            <ErrorState message="Couldn't load notification preferences." onRetry={() => refetch()} />
          ) : (
            <div className={styles.rowList}>
              {NOTIFICATION_PREF_ITEMS.map((item) => (
                <div key={item.key} className={styles.settingRow}>
                  <div className={styles.settingIdentity}>
                    <div className={styles.settingLabel}>{item.label}</div>
                    <div className={styles.settingValue}>{item.sub}</div>
                  </div>
                  <span className={styles.toggleState}>{prefs[item.key] ? "On" : "Off"}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={prefs[item.key]}
                    aria-label={item.label}
                    disabled={updatePrefs.isPending}
                    className={styles.toggle}
                    data-on={prefs[item.key]}
                    onClick={() => toggleChannel(item.key)}
                  >
                    <span className={styles.toggleThumb} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </Card>
      ) : null}

      {tab === "Sessions" ? (
        <Card className={styles.card}>
          <div className={styles.sectionTitle}>Active sessions</div>
          <div className={styles.sectionHint}>Revoking a session signs that device out immediately.</div>
          <div className={styles.rowList}>
            {SESSIONS.map((s) => (
              <div key={s.dev} className={styles.settingRow}>
                <div className={styles.settingIdentity}>
                  <div className={styles.settingLabel}>{s.dev}</div>
                  <div className={styles.settingValue}>{s.meta}</div>
                </div>
                <span className={styles.sessionWhen}>{s.when}</span>
                <button
                  type="button"
                  className={styles.sessionBadge}
                  data-current={s.current}
                  disabled={s.current}
                  onClick={() => {
                    if (s.current) return;
                    logout();
                    pushToast("Signed out of this browser session", "success");
                  }}
                >
                  {s.current ? "This device" : "Revoke"}
                </button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {tab === "Appearance" ? (
        <Card className={styles.card}>
          <div className={styles.sectionTitle}>Appearance & defaults</div>
          <div className={styles.rowList}>
            <div className={styles.settingRow}>
              <div className={styles.settingIdentity}>
                <div className={styles.settingLabel}>Theme</div>
                <div className={styles.settingValue}>{theme === "light" ? "Light" : "Dark"}</div>
              </div>
              <button type="button" className={styles.rowActionBtn} onClick={() => appearanceAction("Theme")}>
                Toggle
              </button>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingIdentity}>
                <div className={styles.settingLabel}>Density</div>
                <div className={styles.settingValue}>Comfortable</div>
              </div>
              <button type="button" className={styles.rowActionBtn} onClick={() => appearanceAction("Density")}>
                Change
              </button>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingIdentity}>
                <div className={styles.settingLabel}>Sidebar</div>
                <div className={styles.settingValue}>{sidebarExpanded ? "Expanded" : "Collapsed"}</div>
              </div>
              <button type="button" className={styles.rowActionBtn} onClick={() => appearanceAction("Sidebar")}>
                Toggle
              </button>
            </div>
            <div className={styles.settingRow}>
              <div className={styles.settingIdentity}>
                <div className={styles.settingLabel}>Default landing screen</div>
                <div className={styles.settingValue}>Command Center</div>
              </div>
              <button
                type="button"
                className={styles.rowActionBtn}
                onClick={() => appearanceAction("Default landing screen")}
              >
                Change
              </button>
            </div>
          </div>
        </Card>
      ) : null}

      <Dialog
        open={passwordDialogOpen}
        onOpenChange={setPasswordDialogOpen}
        title="Change password"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPasswordDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" isLoading={isSubmitting} onClick={handleSubmit(onSubmitPassword)}>
              Update password
            </Button>
          </>
        }
      >
        <form className={styles.form} onSubmit={handleSubmit(onSubmitPassword)} noValidate>
          <FieldLabel>Current password</FieldLabel>
          <Input
            type="password"
            autoComplete="current-password"
            error={errors.currentPassword?.message}
            {...register("currentPassword")}
          />

          <div className={styles.spacer} />
          <FieldLabel>New password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            error={errors.newPassword?.message}
            {...register("newPassword")}
          />

          <div className={styles.spacer} />
          <FieldLabel>Confirm new password</FieldLabel>
          <Input
            type="password"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </form>
      </Dialog>
    </div>
  );
}
