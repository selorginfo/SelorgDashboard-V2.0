/**
 * The backend's permission catalog, grouped by module.
 *
 * This replaces `constants/permissionMatrix` as the source of truth for the Roles screen. That
 * file is a static transcription of the approved design, so its module/action grid has no
 * relationship to the permissions the backend will actually accept — `PUT /admin/roles/:id/matrix`
 * validates every submitted name against the `Permission` collection and rejects unknown ones.
 * Rendering the grid from this catalog is what makes a cell toggle persistable.
 */
export interface PermissionEntry {
  id: string;
  /** Canonical `{domain}.{resource}.{action}` key — this is what the matrix endpoint expects. */
  name: string;
  displayName: string;
  description: string;
  action: string;
  riskLevel: "low" | "medium" | "high";
  dependsOn: string[];
}

export interface PermissionModule {
  module: string;
  permissions: PermissionEntry[];
}

export interface PermissionsMatrix {
  modules: PermissionModule[];
}

export interface PermissionsService {
  getMatrix(): Promise<PermissionsMatrix>;
}

/**
 * Preferred left-to-right column order. Actions outside this list are appended alphabetically so
 * a newly seeded permission action still shows up rather than being silently dropped.
 */
const ACTION_ORDER = [
  "view",
  "read",
  "create",
  "write",
  "edit",
  "update",
  "delete",
  "approve",
  "export",
  "assign",
  "manage",
  "override",
];

/** Distinct actions present in the catalog, in a stable, human-sensible order. */
export function collectActions(matrix: PermissionsMatrix): string[] {
  const seen = new Set<string>();
  for (const mod of matrix.modules) {
    for (const perm of mod.permissions) seen.add(perm.action || "view");
  }
  const known = ACTION_ORDER.filter((a) => seen.has(a));
  const unknown = [...seen].filter((a) => !ACTION_ORDER.includes(a)).sort();
  return [...known, ...unknown];
}

/**
 * Whether a granted permission string satisfies `required`.
 * Mirrors `permissionMatches` in the backend's `config/permissions.ts`, including `*` and
 * `prefix.*` wildcards, so the grid shows the same effective access the API will enforce.
 */
export function permissionMatches(granted: string, required: string): boolean {
  if (!granted || !required) return false;
  if (granted === "*") return true;
  if (granted === required) return true;
  if (granted.endsWith(".*")) return required.startsWith(granted.slice(0, -1));
  return false;
}

export function hasPermission(granted: string[], required: string): boolean {
  return granted.some((g) => permissionMatches(g, required));
}

/** True when a role relies on wildcards, so expanding them into explicit keys is a real change. */
export function usesWildcards(granted: string[]): boolean {
  return granted.some((g) => g === "*" || g.endsWith(".*"));
}

/** Humanise a backend module/action token for display. */
export function humanise(token: string): string {
  return token
    .replace(/[_.]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
