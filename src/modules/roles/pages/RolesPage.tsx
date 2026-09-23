import { useEffect, useMemo, useState } from "react";
import { ROLES } from "@/types/auth";
import type { Role } from "@/types/auth";
import { PERM_MODULES, PERM_COLS, PERM_GRID, ROLE_SCOPE, PERM_TOTAL, grantedCount } from "@/constants/permissionMatrix";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { RecordsListTable } from "@/components/workspace/RecordsListTable";
import { usePermission } from "@/hooks/usePermission";
import { useRolesList, useRolesKpis, usePermissionsMatrix, useUpdateRoleMatrix } from "@/modules/roles/hooks/useRoles";
import { roleToRow, roleId } from "@/services/roles/rolesService";
import type { ApiRole } from "@/services/roles/rolesService";
import { collectActions, hasPermission, humanise, usesWildcards } from "@/services/roles/permissionsService";
import { useUiStore } from "@/store/uiStore";
import type { WorkspaceRow } from "@/types/common";
import styles from "./RolesPage.module.css";

const FLOW = ["Role defined", "Modules selected", "Permissions set", "Reviewed", "Published", "Audited"].map(
  (label) => ({ label, actor: "" })
);

const ROLE_LIST_COLUMNS = ["Role", "Scope", "Users", "Modules", "Sensitive rights", "2FA", "Updated", "Status"];

/**
 * Shown when the backend permission catalog can't be loaded. Without it there is nothing to
 * persist against — `PUT /admin/roles/:id/matrix` validates every key against the `Permission`
 * collection — so the screen falls back to the read-only design grid from `constants/permissionMatrix`.
 */
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

export function RolesPage() {
  const [view, setView] = useState<ViewMode>("workspace");
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);

  const { data: apiRoles } = useRolesList();
  const { data: kpis } = useRolesKpis();
  const { data: matrix } = usePermissionsMatrix();
  const updateMatrix = useUpdateRoleMatrix();

  const canEdit = can("roles", "edit");
  const liveRoles = apiRoles ?? [];
  const hasCatalog = Boolean(matrix && matrix.modules.length > 0);

  // Selection is by backend role id when real roles exist, and by display name otherwise.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [designRole, setDesignRole] = useState<Role>(ROLES[0]);

  const selectedRole: ApiRole | null = useMemo(() => {
    if (!liveRoles.length) return null;
    return liveRoles.find((r) => roleId(r) === selectedId) ?? liveRoles[0] ?? null;
  }, [liveRoles, selectedId]);

  // Draft holds the permission keys being edited; null means "not editing".
  const [draft, setDraft] = useState<Set<string> | null>(null);

  // Abandon an in-progress edit when the selected role changes, so edits can't leak across roles.
  useEffect(() => {
    setDraft(null);
  }, [selectedRole?.name]);

  const listRows: WorkspaceRow[] = liveRoles.length > 0 ? liveRoles.map(roleToRow) : FALLBACK_ROWS;

  const actions = useMemo(() => (matrix ? collectActions(matrix) : []), [matrix]);
  const grantedKeys = useMemo(() => selectedRole?.permissions ?? [], [selectedRole]);

  const isSystemRole = selectedRole?.roleType === "system";
  const editable = hasCatalog && canEdit && !!selectedRole && !isSystemRole;

  /** Effective grant for a permission key — draft while editing, otherwise the role's own keys. */
  function isGranted(name: string): boolean {
    if (draft) return draft.has(name);
    return hasPermission(grantedKeys, name);
  }

  function beginEdit() {
    if (!selectedRole || !matrix) return;
    // Wildcards can't round-trip through the matrix endpoint, so expand them into the explicit
    // keys they currently cover. Warn first: saving then narrows the role to today's catalog.
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
    ? selectedRole.scope ?? "Global"
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
                          // No permission exists for this module/action pair — nothing to grant.
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
    </div>
  );
}
