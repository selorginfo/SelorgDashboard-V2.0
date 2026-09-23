import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, Menu } from "lucide-react";
import { MODULE_BREADCRUMBS, type ModuleId } from "@/constants/nav";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import { DropdownMenu } from "@/components/ui/DropdownMenu";
import { Icon } from "@/components/ui/Icon";
import { ICONS } from "@/constants/icons";
import styles from "./Topbar.module.css";

const notificationCount = "0";

export function Topbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useSessionStore((s) => s.user);
  const role = useSessionStore((s) => s.role);
  const logout = useSessionStore((s) => s.logout);
  const theme = useUiStore((s) => s.theme);
  const setTheme = useUiStore((s) => s.setTheme);
  const toggleMobileNav = useUiStore((s) => s.toggleMobileNav);

  const moduleId = location.pathname.slice(1).split("/")[0] as ModuleId;
  const breadcrumb = MODULE_BREADCRUMBS[moduleId];
  const initials = (user?.name ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className={styles.header}>
      <button
        type="button"
        className={styles.hamburgerBtn}
        onClick={toggleMobileNav}
        aria-label="Open navigation menu"
      >
        <Menu size={18} />
      </button>

      <div className={styles.breadcrumb}>
        {breadcrumb ? (
          <>
            <span className={styles.crumbMuted}>{breadcrumb[0]}</span>
            <span className={styles.crumbSep}>/</span>
            <span className={styles.crumbActive}>{breadcrumb[1]}</span>
          </>
        ) : (
          <span className={styles.crumbActive}>Selorg Admin</span>
        )}
      </div>

      <div className={styles.actions}>
        <label className={styles.search}>
          <Icon paths={ICONS.search as string[]} size={14} />
          <input
            type="text"
            placeholder="Search order, SKU, rider…"
            aria-label="Search order, SKU, rider"
          />
        </label>

        <button
          type="button"
          className={styles.iconBtn}
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          title="Toggle theme"
        >
          <Icon paths={(theme === "light" ? ICONS.moon : ICONS.sun) as string[]} size={16} />
        </button>

        <button type="button" className={styles.iconBtn} title="Notifications" onClick={() => navigate("/notifications")}>
          <Icon paths={ICONS.bell as string[]} size={16} />
          {notificationCount !== "0" ? <span className={styles.bellBadge}>{notificationCount}</span> : null}
        </button>

        <DropdownMenu
          trigger={
            <button type="button" className={styles.account}>
              <span className={styles.avatar}>{initials}</span>
              <span className={styles.accountText}>
                <span className={styles.accountName}>{user?.name ?? "Account"}</span>
                <span className={styles.accountRole}>{role}</span>
              </span>
              <ChevronDown size={13} />
            </button>
          }
          header={
            <>
              <div className={styles.menuName}>{user?.name ?? "Account"}</div>
              <div className={styles.menuEmail}>{user?.email}</div>
              <div className={styles.menuRoleBadge}>{role}</div>
            </>
          }
          items={[
            { label: "Account settings", sub: "Profile, password, notifications", onSelect: () => navigate("/account") },
            {
              label: "Sign out",
              sub: "End this session",
              destructive: true,
              onSelect: () => {
                logout();
                navigate("/login");
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
