import { NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";
import { useState } from "react";
import { NAV_GROUPS } from "@/constants/nav";
import { NAV_ICONS } from "@/constants/navIcons";
import { useSessionStore } from "@/store/sessionStore";
import { useUiStore } from "@/store/uiStore";
import styles from "./Sidebar.module.css";

export function Sidebar() {
  const role = useSessionStore((s) => s.role);
  const expanded = useUiStore((s) => s.sidebarExpanded);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const visibleGroups = NAV_GROUPS.filter((g) => g.roles === null || (role && g.roles.includes(role)));

  return (
    <>
      {mobileNavOpen ? (
        <div className={styles.overlay} onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
      ) : null}
      <aside className={styles.aside} data-expanded={expanded} data-mobile-open={mobileNavOpen}>
      <div className={styles.brandRow}>
        <div className={styles.mark}>S</div>
        {expanded ? (
          <div className={styles.brandText}>
            <div className={styles.brandName}>Selorg</div>
            <div className={styles.brandSub}>Admin V1</div>
          </div>
        ) : null}
        <button
          type="button"
          className={styles.collapseBtn}
          onClick={toggleSidebar}
          title={expanded ? "Collapse sidebar" : "Expand sidebar"}
        >
          {expanded ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
        </button>
      </div>

      <nav className={styles.nav}>
        {visibleGroups.map((group) => {
          const isOpen = !collapsedGroups[group.label];
          return (
            <div key={group.label} className={styles.group}>
              {expanded ? (
                <button
                  type="button"
                  className={styles.groupHeader}
                  onClick={() =>
                    setCollapsedGroups((s) => ({ ...s, [group.label]: !s[group.label] }))
                  }
                >
                  <span>{group.label}</span>
                  <ChevronDown size={12} data-open={isOpen} className={styles.caret} />
                </button>
              ) : (
                <div className={styles.groupHeaderCollapsed}>{group.label.slice(0, 2)}</div>
              )}
              {isOpen ? (
                <div className={styles.items}>
                  {group.items.map((item) => {
                    const Icon = NAV_ICONS[item.id];
                    return (
                      <NavLink
                        key={item.id}
                        to={`/${item.id}`}
                        title={item.label}
                        onClick={() => setMobileNavOpen(false)}
                        className={({ isActive }) =>
                          [styles.item, isActive ? styles.itemActive : ""].join(" ")
                        }
                      >
                        <span className={styles.itemIcon}>
                          <Icon size={15} strokeWidth={1.7} />
                        </span>
                        {expanded ? (
                          <>
                            <span className={styles.itemLabel}>{item.label}</span>
                          </>
                        ) : null}
                      </NavLink>
                    );
                  })}
                </div>
              ) : null}
            </div>
          );
        })}
      </nav>
      </aside>
    </>
  );
}
