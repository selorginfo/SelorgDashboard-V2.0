import { useMemo, useState } from "react";
import {
  useSystemUsers,
  useSetUserActive,
  useCreateAdminUser,
  useResetUserPassword,
  useAssignUserRole,
  useUpdateUser,
} from "@/modules/system/hooks/useUsers";
import { useRolesList } from "@/modules/roles/hooks/useRoles";
import { AdminUserFormModal } from "@/modules/system/components/AdminUserFormModal";
import type { AdminUserInput } from "@/services/system/usersService";
import { roleId } from "@/services/roles/rolesService";
import { SYSTEM_CONFIGS } from "@/services/workspace/data/system";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { Dialog } from "@/components/ui/Dialog";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { SystemUser } from "@/types/system";
import type { WorkspaceRow } from "@/types/common";
import styles from "./UsersDirectoryPage.module.css";

const CONFIG = SYSTEM_CONFIGS.users;
const TABS = CONFIG?.tabs ?? [];

const FLOW = ["Invited", "Accepted", "Role assigned", "Scope set", "Active", "Reviewed", "Deactivated"].map(
  (label) => ({ label, actor: "" })
);
const FLOW_AT = 4;

const INVITE_UNAVAILABLE =
  "Resend invite is not available — the backend has no invite-resend endpoint. Create the user again or reset their password.";

function matchesTab(user: SystemUser, tab: string): boolean {
  if (tab === "Admin users") return user.accountStatus === "active";
  if (tab === "Invites") return user.accountStatus === "invited";
  if (tab === "Access review") return user.flagged;
  if (tab === "Deactivated") return user.accountStatus === "deactivated";
  return true;
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function exportAccessCsv(user: SystemUser) {
  const rows = [
    ["Field", "Value"],
    ["Name", user.name],
    ["Email", user.email],
    ["Role", user.role],
    ["Scope", user.scope],
    ["Modules", user.moduleCount],
    ["Sensitive rights", user.sensitiveRights],
    ["2FA", user.twoFactor],
    ["Status", user.status.label],
    ["Last login", user.lastLogin],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `access-${user.email.replace(/[^a-z0-9]/gi, "_")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function UsersDirectoryPage() {
  const { data: users, isLoading, isError, refetch } = useSystemUsers();
  const { data: roles } = useRolesList();
  const setActive = useSetUserActive();
  const createUser = useCreateAdminUser();
  const resetPassword = useResetUserPassword();
  const assignRole = useAssignUserRole();
  const updateUser = useUpdateUser();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const [tab, setTab] = useState(TABS[0] ?? "Admin users");
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [view, setView] = useState<ViewMode>("workspace");
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pickedRoleId, setPickedRoleId] = useState("");
  const [scopeInput, setScopeInput] = useState("");

  const filtered = useMemo(() => (users ?? []).filter((u) => matchesTab(u, tab)), [users, tab]);

  const liveKpis = useMemo(() => {
    const list = users ?? [];
    const active = list.filter((u) => u.accountStatus === "active").length;
    const invited = list.filter((u) => u.accountStatus === "invited").length;
    const deactivated = list.filter((u) => u.accountStatus === "deactivated").length;
    const twoFaOff = list.filter((u) => u.twoFactor === "Off").length;
    const rolesInUse = new Set(list.map((u) => u.role).filter(Boolean)).size;
    return [
      { value: String(list.length), label: "Admin users" },
      { value: String(active), label: "Active" },
      { value: String(invited), label: "Pending invites", color: invited ? "var(--amber-tx)" : undefined },
      { value: String(deactivated), label: "Deactivated" },
      { value: String(twoFaOff), label: "2FA off", color: twoFaOff ? "var(--red-tx)" : undefined },
      { value: String(rolesInUse), label: "Roles in use" },
    ];
  }, [users]);

  if (isLoading) return <CardSkeleton />;
  if (isError || !users) return <ErrorState message="Couldn't load admin users." onRetry={() => refetch()} />;

  const canEdit = can("users", "edit");
  const selected = filtered.find((u) => u.id === selectedId) ?? filtered[0];
  const userRows: WorkspaceRow[] = filtered.map((u) => [
    `${u.name} · ${u.role}`,
    u.scope,
    u.email,
    u.moduleCount,
    u.sensitiveRights,
    u.lastLogin,
    u.twoFactor,
    u.status,
  ]);

  function toggleActive(user: SystemUser) {
    const activating = user.accountStatus === "deactivated";
    setActive.mutate(
      { id: user.id, active: activating },
      {
        onSuccess: () => pushToast(`${user.name} — ${activating ? "reactivated" : "deactivated"}`, "success"),
        onError: () => pushToast("Couldn't update the account", "error"),
      }
    );
  }

  function handleResetPassword(user: SystemUser) {
    resetPassword.mutate(
      { id: user.id, sendEmail: true },
      {
        onSuccess: (res) => {
          pushToast(
            res.emailSent
              ? `Password reset email sent to ${user.email}`
              : `Password reset for ${user.name}${res.newPassword ? ` — temp: ${res.newPassword}` : ""}`,
            "success"
          );
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't reset password", "error"),
      }
    );
  }

  function handleForce2fa(user: SystemUser) {
    updateUser.mutate(
      { id: user.id, input: { twoFactorEnabled: true } },
      {
        onSuccess: () => pushToast(`2FA enforced for ${user.name}`, "success"),
        onError: (e) => pushToast((e as Error).message || "Couldn't enforce 2FA", "error"),
      }
    );
  }

  function openRoleDialog(user: SystemUser) {
    const match = (roles ?? []).find((r) => r.name === user.role);
    setPickedRoleId(match ? roleId(match) : "");
    setRoleDialogOpen(true);
  }

  function saveRole(user: SystemUser) {
    if (!pickedRoleId) {
      pushToast("Pick a role first", "error");
      return;
    }
    assignRole.mutate(
      { id: user.id, roleId: pickedRoleId },
      {
        onSuccess: () => {
          pushToast(`Role updated for ${user.name}`, "success");
          setRoleDialogOpen(false);
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't assign role", "error"),
      }
    );
  }

  function openScopeDialog(user: SystemUser) {
    setScopeInput(user.scope === "Global" || user.scope === "—" ? "" : user.scope);
    setScopeDialogOpen(true);
  }

  function saveScope(user: SystemUser) {
    const stores = scopeInput
      .split(/[,;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    updateUser.mutate(
      { id: user.id, input: { assignedStores: stores } },
      {
        onSuccess: () => {
          pushToast(
            stores.length ? `Scope set to ${stores.join(", ")}` : `Scope cleared for ${user.name}`,
            "success"
          );
          setScopeDialogOpen(false);
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't update scope", "error"),
      }
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="users" flow={FLOW} activeIndex={FLOW_AT} />

      <KpiStrip kpis={liveKpis} moduleId="users" />

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.tabChip}
            data-active={t === tab}
            onClick={() => {
              setTab(t);
              setSelectedId(undefined);
            }}
          >
            {t}
          </button>
        ))}
        <div className={styles.tabsSpacer} />
        <span className={styles.recordCount}>{filtered.length} records</span>
        <ViewToggle view={view} onChange={setView} />
        {canEdit ? (
          <Button variant="primary" size="sm" onClick={() => setNewUserOpen(true)}>
            + New admin user
          </Button>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <EmptyState title={`Nobody in "${tab}"`} />
      ) : view === "list" ? (
        <RecordsListTable
          columns={CONFIG?.columns ?? []}
          rows={userRows}
          onRowClick={(i) => {
            setSelectedId(filtered[i]!.id);
            setView("workspace");
          }}
        />
      ) : (
        <div className={styles.board}>
          <Card className={styles.list}>
            {filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                className={styles.listRow}
                data-selected={user.id === selected?.id}
                onClick={() => setSelectedId(user.id)}
              >
                <span className={styles.avatar}>{initials(user.name)}</span>
                <div className={styles.listBody}>
                  <div className={styles.listName}>{user.name}</div>
                  <div className={styles.listRole}>{user.role}</div>
                </div>
              </button>
            ))}
          </Card>

          {selected ? (
            <div className={styles.detailCol}>
              <Card className={styles.detailCard}>
                <div className={styles.detailHeader}>
                  <span className={styles.avatarLg}>{initials(selected.name)}</span>
                  <div className={styles.detailHeaderBody}>
                    <div className={styles.detailName}>{selected.name}</div>
                    <div className={styles.detailRole}>{selected.role}</div>
                  </div>
                  <Badge label={selected.status.label} tone={selected.status.tone} />
                </div>

                <div className={styles.statsGrid}>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>Scope</span>
                    <span className={styles.statValue}>{selected.scope}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>Email</span>
                    <span className={styles.statValue}>{selected.email}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>Modules</span>
                    <span className={styles.statValue}>{selected.moduleCount}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>Sensitive rights</span>
                    <span className={styles.statValue}>{selected.sensitiveRights}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>Last login</span>
                    <span className={styles.statValue}>{selected.lastLogin}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>2FA</span>
                    <span className={styles.statValue}>{selected.twoFactor}</span>
                  </div>
                  <div className={styles.statCell}>
                    <span className={styles.statLabel}>Status</span>
                    <span className={styles.statValue}>{selected.status.label}</span>
                  </div>
                </div>

                {canEdit ? (
                  <div className={styles.actionsRow}>
                    <Button size="sm" onClick={() => openRoleDialog(selected)}>
                      Edit role
                    </Button>
                    <Button size="sm" onClick={() => openScopeDialog(selected)}>
                      Change scope
                    </Button>
                    {selected.accountStatus === "invited" ? (
                      <Button size="sm" disabled title={INVITE_UNAVAILABLE}>
                        Resend invite
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      isLoading={resetPassword.isPending}
                      onClick={() => handleResetPassword(selected)}
                    >
                      Reset password
                    </Button>
                    <Button
                      size="sm"
                      isLoading={updateUser.isPending}
                      onClick={() => handleForce2fa(selected)}
                    >
                      Force 2FA
                    </Button>
                    {selected.accountStatus !== "invited" ? (
                      <Button
                        size="sm"
                        variant={selected.accountStatus === "deactivated" ? "primary" : "danger"}
                        isLoading={setActive.isPending}
                        onClick={() => toggleActive(selected)}
                      >
                        {selected.accountStatus === "deactivated" ? "Reactivate user" : "Deactivate user"}
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => {
                        exportAccessCsv(selected);
                        pushToast(`Access list exported for ${selected.name}`, "success");
                      }}
                    >
                      Export access list
                    </Button>
                  </div>
                ) : null}
              </Card>
            </div>
          ) : null}
        </div>
      )}

      <AdminUserFormModal
        open={newUserOpen}
        onOpenChange={setNewUserOpen}
        isLoading={createUser.isPending}
        onSubmit={(input: AdminUserInput) => {
          createUser.mutate(input, {
            onSuccess: (u) => {
              pushToast(`${u.name} created`, "success");
              setNewUserOpen(false);
            },
            onError: (e) => pushToast((e as Error).message, "error"),
          });
        }}
      />

      <Dialog open={roleDialogOpen} onOpenChange={setRoleDialogOpen} title={`Edit role — ${selected?.name ?? ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Role
            <select
              value={pickedRoleId}
              onChange={(e) => setPickedRoleId(e.target.value)}
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            >
              <option value="">Select a role…</option>
              {(roles ?? []).map((r) => (
                <option key={roleId(r)} value={roleId(r)}>
                  {r.name}
                </option>
              ))}
            </select>
          </label>
          <Button
            variant="primary"
            size="sm"
            isLoading={assignRole.isPending}
            disabled={!selected || !pickedRoleId}
            onClick={() => selected && saveRole(selected)}
          >
            Save role
          </Button>
        </div>
      </Dialog>

      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen} title={`Change scope — ${selected?.name ?? ""}`}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600 }}>
            Assigned stores (comma-separated codes)
            <input
              value={scopeInput}
              onChange={(e) => setScopeInput(e.target.value)}
              placeholder="e.g. DS-Adyar-01, DS-02"
              style={{ display: "block", width: "100%", marginTop: 6, padding: 8 }}
            />
          </label>
          <Button
            variant="primary"
            size="sm"
            isLoading={updateUser.isPending}
            disabled={!selected}
            onClick={() => selected && saveScope(selected)}
          >
            Save scope
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
