import { useEffect, useMemo, useState } from "react";
import { ROLES } from "@/types/auth";
import type { Role } from "@/types/auth";
import { PERM_MODULES, PERM_COLS, PERM_GRID, ROLE_SCOPE, PERM_TOTAL, grantedCount } from "@/constants/permissionMatrix";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, FieldLabel } from "@/components/ui/Input";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useRolesList, useRolesKpis, usePermissionsMatrix, useUpdateRoleMatrix, useCreateRole } from "@/modules/roles/hooks/useRoles";
import { roleToRow, roleId, ROLE_PERMISSION_PRESETS, type AccessScope } from "@/services/roles/rolesService";
import type { ApiRole } from "@/services/roles/rolesService";
import { collectActions, hasPermission, humanise, usesWildcards } from "@/services/roles/permissionsService";
import { useUiStore } from "@/store/uiStore";
import type { WorkspaceRow } from "@/types/common";
import styles from "./RolesPage.module.css";

const FLOW = ["Role defined", "Modules selected", "Permissions set", "Reviewed", "Published", "Audited"].map(
  (label) => ({ label, actor: "" })
);

const ROLE_LIST_COLUMNS = ["Role", "Scope", "Users", "Modules", "Sensitive rights", "2FA", "Updated", "Status"];

const DESIGN_GRID_REASON =
  "Read-only: showing the approved design grid because the backend permission catalog is unavailable.";

const SYSTEM_ROLE_REASON = "System roles are protected server-side and cannot be edited.";

const FALLBACK_ROWS: WorkspaceRow[] = [
  ["Super Admin", "Global", "2", "26", "All rights", "Required", "01 Aug", { label: "System", tone: "blue" }],
  ["Operations Admin", "Global", "4", "14", "Approve, Assign", "Required", "12 Aug", { label: "Active", tone: "green" }],
  ["Warehouse Manager", "WH-01", "3", "8", "Approve", "Required", "12 Aug", { label: "Active", tone: "green" }],
  ["Dark Store Manager", "Assigned store", "18", "9", "Assign", "Required", "18 Aug", { label: "Active", tone: "green" }],
  ["Rider Manager", "All hubs", "2", "5", "Assign", "Optional", "20 Aug", { label: "Review", tone: "amber" }],
  ["Customer Support", "Global", "8", "6", "Refund (≤ ₹500)", "Required", "22 Aug", { label: "Active", tone: "green" }],
  ["Finance Admin", "Global", "3", "6", "Refund, Export", "Required", "22 Aug", { label: "Active", tone: "green" }],
  ["Catalog Manager", "Global", "1", "4", "Approve", "Optional", "24 Aug", { label: "Review", tone: "amber" }],
];

const ACCESS_SCOPE_OPTIONS: { value: AccessScope; label: string; hint: string }[] = [
  { value: "global", label: "Global", hint: "All warehouses and dark stores" },
  { value: "zone", label: "Zone", hint: "Limited to a delivery zone / hub set" },
  { value: "store", label: "Store", hint: "Only the dark store assigned to each user" },
];

export function RolesPage() {
  const [view, setView] = useState<ViewMode>("workspace");
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const { data: apiRoles } = useRolesList();
  const { data: kpis } = useRolesKpis();
  const { data: matrix } = usePermissionsMatrix();
  const updateMatrix = useUpdateRoleMatrix();
  const createRole = useCreateRole();

  const canEdit = can("roles", "edit");
  const liveRoles = apiRoles ?? [];
  const hasCatalog = Boolean(matrix && matrix.modules.length > 0);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [designRole, setDesignRole] = useState<Role>(ROLES[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState("Dark Store Manager");
  const [newDescription, setNewDescription] = useState(
    "Manages a single assigned dark store — orders, picking, inventory and picker ops."
  );
  const [newScope, setNewScope] = useState<AccessScope>("store");

  const selectedRole: ApiRole | null = useMemo(() => {
    if (!liveRoles.length) return null;
    return liveRoles.find((r) => roleId(r) === selectedId) ?? liveRoles[0] ?? null;
  }, [liveRoles, selectedId]);

  const [draft, setDraft] = useState<Set<string> | null>(null);

  useEffect(() => {
    setDraft(null);
  }, [selectedRole?.name]);

  const listRows: WorkspaceRow[] = liveRoles.length > 0 ? liveRoles.map(roleToRow) : FALLBACK_ROWS;

  const actions = useMemo(() => (matrix ? collectActions(matrix) : []), [matrix]);
  const grantedKeys = useMemo(() => selectedRole?.permissions ?? [], [selectedRole]);

  const isSystemRole = selectedRole?.roleType === "system";
  const editable = hasCatalog && canEdit && !!selectedRole && !isSystemRole;

  function isGranted(name: string): boolean {
    if (draft) return draft.has(name);
    return hasPermission(grantedKeys, name);
  }

  function beginEdit() {
    if (!selectedRole || !matrix) return;
    const expanded = new Set<string>();
    for (const mod of matrix.modules) {
      for (const perm of mod.permissions) {
        if (hasPermission(grantedKeys, perm.name)) expanded.add(perm.name);
      }
    }
    if (usesWildcards(grantedKeys)) {
      pushToast(
        "This role uses wildcard permissions. Saving replaces them with the explicit permissions shown.",
        "info"
      );
    }
    setDraft(expanded);
  }

  function toggle(name: string) {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function save() {
    if (!selectedRole || !draft) return;
    const permissions = [...draft];
    if (permissions.length === 0) {
      pushToast("A role needs at least one permission.", "error");
      return;
    }
    updateMatrix.mutate(
      { id: roleId(selectedRole), permissions },
      {
        onSuccess: () => {
          pushToast(`Permissions updated for ${selectedRole.name}`, "success");
          setDraft(null);
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't save permissions", "error"),
      }
    );
  }

  function applyPresetName(name: string) {
    setNewName(name);
    if (name === "Dark Store Manager") {
      setNewScope("store");
      setNewDescription("Manages a single assigned dark store — orders, picking, inventory and picker ops.");
    } else if (name === "Warehouse Manager") {
      setNewScope("store");
      setNewDescription("Manages central warehouse receiving, putaway and transfers.");
    } else if (name === "Operations Admin") {
      setNewScope("global");
      setNewDescription("Cross-store operations admin with global access.");
    }
  }

  function handleCreateRole() {
    const name = newName.trim();
    if (!name) {
      pushToast("Role name is required", "error");
      return;
    }
    const permissions =
      ROLE_PERMISSION_PRESETS[name] ??
      (newScope === "store"
        ? ROLE_PERMISSION_PRESETS["Dark Store Manager"]
        : ["orders.read", "analytics.reports.read"]);
    createRole.mutate(
      {
        name,
        description: newDescription.trim() || undefined,
        accessScope: newScope,
        permissions,
      },
      {
        onSuccess: (role) => {
          pushToast(`${role.name} created · scope ${role.scope ?? newScope}`, "success");
          setCreateOpen(false);
          setSelectedId(roleId(role));
        },
        onError: (e) => pushToast((e as Error).message || "Couldn't create role", "error"),
      }
    );
  }

  const catalogGranted = useMemo(() => {
    if (!matrix) return 0;
    let n = 0;
    for (const mod of matrix.modules) {
      for (const perm of mod.permissions) if (isGranted(perm.name)) n++;
    }
    return n;
  }, [matrix, draft, grantedKeys]);

  const catalogTotal = useMemo(
    () => (matrix ? matrix.modules.reduce((sum, m) => sum + m.permissions.length, 0) : 0),
    [matrix]
  );

  const headerName = hasCatalog && selectedRole ? selectedRole.name : designRole;
  const headerScope = hasCatalog && selectedRole
    ? selectedRole.scope ?? (selectedRole.accessScope === "store" ? "Assigned store" : "Global")
    : ROLE_SCOPE[designRole];

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="roles" flow={FLOW} />

      <KpiStrip
        moduleId="roles"
        kpis={[
          { value: kpis ? String(kpis.total) : "8", label: "Roles" },
          { value: hasCatalog ? String(matrix!.modules.length) : "26", label: "Modules" },
          { value: kpis ? String(kpis.withRefundRights) : "3", label: "With refund rights" },
          { value: kpis ? String(kpis.withApproveRights) : "5", label: "With approve rights" },
          { value: kpis ? String(kpis.changesLast30d) : "17", label: "Permission changes 30d" },
          { value: kpis ? String(kpis.underReview) : "2", label: "Roles under review", color: "var(--amber-tx)" },
        ]}
      />

      <div className={styles.headerRow}>
        <ViewToggle view={view} onChange={setView} />
        {canEdit ? (
          <Button variant="primary" size="sm" onClick={() => setCreateOpen(true)}>
            + Create role
          </Button>
        ) : null}
      </div>

      {view === "list" ? (
        <RecordsListTable
          columns={ROLE_LIST_COLUMNS}
          rows={listRows}
          onRowClick={(i) => {
            const target = liveRoles[i];
            if (target) setSelectedId(roleId(target));
            else {
              const rowName = listRows[i]?.[0];
              const r = ROLES.find((x) => x === rowName);
              if (r) setDesignRole(r);
            }
            setView("workspace");
          }}
        />
      ) : (
        <div className={styles.board}>
          <Card className={styles.rolesCard}>
            <div className={styles.rolesTitle}>Roles</div>
            <div className={styles.rolesList}>
              {liveRoles.length > 0
                ? liveRoles.map((r) => (
                    <button
                      key={roleId(r)}
                      type="button"
                      className={styles.roleItem}
                      data-active={roleId(r) === roleId(selectedRole ?? r)}
                      onClick={() => setSelectedId(roleId(r))}
                    >
                      {r.name}
                      {r.accessScope === "store" || (r.scope || "").toLowerCase().includes("store") ? (
                        <span className={styles.scopeTag}>Store</span>
                      ) : null}
                    </button>
                  ))
                : ROLES.map((r) => (
                    <button
                      key={r}
                      type="button"
                      className={styles.roleItem}
                      data-active={r === designRole}
                      onClick={() => setDesignRole(r)}
                    >
                      {r}
                    </button>
                  ))}
            </div>
          </Card>

          <Card className={styles.matrixCard}>
            <div className={styles.matrixHeader}>
              <div>
                <div className={styles.matrixRole}>{headerName}</div>
                <div className={styles.matrixScope}>{headerScope}</div>
              </div>
              <div className={styles.matrixHeaderRight}>
                <div className={styles.matrixGranted}>
                  {hasCatalog
                    ? `${catalogGranted} / ${catalogTotal} granted`
                    : `${grantedCount(designRole)} / ${PERM_TOTAL} granted`}
                </div>
                {canEdit ? (
                  draft ? (
                    <>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={save}
                        disabled={updateMatrix.isPending}
                      >
                        {updateMatrix.isPending ? "Saving…" : "Save"}
                      </button>
                      <button
                        type="button"
                        className={styles.editBtn}
                        onClick={() => setDraft(null)}
                        disabled={updateMatrix.isPending}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className={styles.editBtn}
                      onClick={beginEdit}
                      disabled={!editable}
                      title={
                        !hasCatalog ? DESIGN_GRID_REASON : isSystemRole ? SYSTEM_ROLE_REASON : undefined
                      }
                    >
                      Edit role
                    </button>
                  )
                ) : null}
              </div>
            </div>

            <div className={styles.tableScroll}>
              {hasCatalog ? (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.moduleHeadCell}>Module</th>
                      {actions.map((a) => (
                        <th key={a}>{humanise(a)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrix!.modules.map((mod) => (
                      <tr key={mod.module}>
                        <td className={styles.moduleCell}>{humanise(mod.module)}</td>
                        {actions.map((action) => {
                          const perm = mod.permissions.find((p) => (p.action || "view") === action);
                          if (!perm) {
                            return (
                              <td key={action} className={styles.permCell}>
                                <span className={styles.permMark} aria-hidden="true" />
                              </td>
                            );
                          }
                          const on = isGranted(perm.name);
                          return (
                            <td key={action} className={styles.permCell}>
                              <button
                                type="button"
                                className={styles.permMark}
                                data-on={on}
                                disabled={!draft}
                                onClick={() => toggle(perm.name)}
                                aria-pressed={on}
                                title={`${perm.displayName} (${perm.name})`}
                              >
                                {on ? "✓" : "–"}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.moduleHeadCell}>Module</th>
                      {PERM_COLS.map((c) => (
                        <th key={c}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERM_MODULES.map((m, i) => (
                      <tr key={m}>
                        <td className={styles.moduleCell}>{m}</td>
                        {PERM_COLS.map((c, j) => (
                          <td key={c} className={styles.permCell}>
                            <button
                              type="button"
                              className={styles.permMark}
                              data-on={PERM_GRID[designRole][i]?.[j] === "1"}
                              disabled
                              title={DESIGN_GRID_REASON}
                            >
                              {PERM_GRID[designRole][i]?.[j] === "1" ? "✓" : "–"}
                            </button>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </Card>
        </div>
      )}

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create role"
        description="Pick a name and access scope. Store-scoped roles (like Dark Store Manager) only see the dark store assigned to each user."
        footer={
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button size="sm" variant="secondary" onClick={() => setCreateOpen(false)} disabled={createRole.isPending}>
              Cancel
            </Button>
            <Button size="sm" variant="primary" isLoading={createRole.isPending} onClick={handleCreateRole}>
              Create role
            </Button>
          </div>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <FieldLabel>Quick presets</FieldLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {["Dark Store Manager", "Warehouse Manager", "Operations Admin"].map((preset) => (
                <Button key={preset} size="sm" variant="secondary" type="button" onClick={() => applyPresetName(preset)}>
                  {preset}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Role name *</FieldLabel>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Dark Store Manager" />
          </div>
          <div>
            <FieldLabel>Description</FieldLabel>
            <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="What this role can do" />
          </div>
          <div>
            <FieldLabel>Access scope *</FieldLabel>
            <select
              value={newScope}
              onChange={(e) => setNewScope(e.target.value as AccessScope)}
              style={{ width: "100%", padding: "8px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--bg)", color: "var(--tx)", fontSize: "0.875rem" }}
            >
              {ACCESS_SCOPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label} — {o.hint}
                </option>
              ))}
            </select>
            {newScope === "store" ? (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "var(--tx-muted)" }}>
                When you create a user with this role, you must select which dark store they control.
              </p>
            ) : null}
          </div>
        </div>
      </Dialog>
    </div>
  );
}
