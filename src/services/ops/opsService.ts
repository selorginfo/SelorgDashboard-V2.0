import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { OPS_SCREENS, actionForm, cellText, defaultStage, recordId } from "@/modules/ops/screens";
import { OPS_EFFECTS } from "@/modules/ops/data/effects";
import type { OpsLogEntry, OpsRouteState } from "@/modules/ops/types";
import type { WorkspaceRow } from "@/types/common";

export interface ApplyActionInput {
  route: string;
  ids: string[];
  action: string;
  values: Record<string, string>;
  by: string;
}

export interface SaveRecordInput {
  route: string;
  tab: string;
  /** Record being edited; omitted when creating. */
  id?: string;
  row: WorkspaceRow;
  by: string;
  note?: string;
}

export interface OpsService {
  getRoute(route: string): Promise<OpsRouteState>;
  getKpis(route: string): Promise<{ value: string; label: string; color?: string }[]>;
  calculateRoute(stops: Array<{ lat: number; lng: number; id?: string }>): Promise<{
    distanceKm: number;
    durationMin: number;
    sequence: string[];
    provider: string;
  }>;
  applyAction(input: ApplyActionInput): Promise<OpsRouteState>;
  saveRecord(input: SaveRecordInput): Promise<OpsRouteState>;
  deleteRecord(route: string, id: string): Promise<OpsRouteState>;
  advanceStage(route: string, id: string, by: string): Promise<OpsRouteState>;
}

/**
 * Local implementation for the Delivery and Container Stalls screens. The backend exposes a few
 * related endpoints (rider fleet, dispatch clusters, zones — see docs/DELIVERY_AND_CONTAINER_STALLS_ENDPOINTS.md)
 * but none with these records' shape yet, so every route is seeded from the design and persisted
 * to localStorage. Each route is one table holding a single OpsRouteState; the version is derived
 * from the seed, so regenerating the design data resets stale local copies.
 */
const tables = new Map<string, ReturnType<typeof createMockTable<OpsRouteState>>>();

function seedHash(route: string): number {
  const s = JSON.stringify(OPS_SCREENS[route]?.rows ?? {});
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

function table(route: string) {
  let t = tables.get(route);
  if (!t) {
    const screen = OPS_SCREENS[route];
    if (!screen) throw new MockApiError(`Unknown screen ${route}`);
    t = createMockTable<OpsRouteState>(`selorg.ops.${route}`, [{ rows: screen.rows, stage: {}, log: {} }], seedHash(route));
    tables.set(route, t);
  }
  return t;
}

function read(route: string): OpsRouteState {
  return table(route).all()[0]!;
}

function write(route: string, state: OpsRouteState): OpsRouteState {
  table(route).set([state]);
  return state;
}

/** Statuses a record can't be moved on from. */
const TERMINAL = /^(completed|all delivered|delivered|cancelled|retired|expired|ended|trip closed|resolved|paid|inactive|reconciled|refunded)\b/i;

/**
 * Actions that are valid on a closed record: bringing it back (reactivate a stall, version an
 * expired rule) or acting after the fact (refund a delivered order, flag a delivered conversion).
 */
const AFTER_CLOSE = /^(Change status|Create new version|Mark available|Flag as invalid|Reattribute conversion|Refund delivery|Refund order|Review performance|Report stop issue)$/;

function findRow(state: OpsRouteState, id: string): WorkspaceRow | undefined {
  for (const list of Object.values(state.rows)) {
    const hit = list.find((r) => recordId(r) === id);
    if (hit) return hit;
  }
  return undefined;
}

function logEntry(action: string, by: string, note?: string): OpsLogEntry {
  return { id: crypto.randomUUID(), action, by, at: new Date().toISOString(), note };
}

/** Applies fn to every row (in every tab) whose id is in ids. */
function mapRows(state: OpsRouteState, ids: string[], fn: (row: WorkspaceRow) => WorkspaceRow | null) {
  const rows = Object.fromEntries(
    Object.entries(state.rows).map(([tab, list]) => [
      tab,
      list.flatMap((row) => {
        if (!ids.includes(recordId(row))) return [row];
        const next = fn(row);
        return next ? [next] : [];
      }),
    ])
  );
  return { ...state, rows };
}

function summary(values: Record<string, string>, fieldLabels: Record<string, string>): string {
  return Object.entries(values)
    .filter(([, val]) => val && val.trim())
    .map(([k, val]) => (k === "note" ? val.trim() : `${fieldLabels[k] ?? k}: ${val.trim()}`))
    .join(" · ");
}

export const mockOpsService: OpsService = {
  async getRoute(route) {
    await mockDelay(200);
    return read(route);
  },

  async getKpis(route) {
    await mockDelay(80);
    // Even in mock mode, compute from table rows rather than design vanity numbers
    const state = read(route);
    const rows = Object.values(state.rows).flat();
    const screen = OPS_SCREENS[route];
    return (screen?.kpis ?? []).map((k, i) =>
      i === 0 ? { ...k, value: String(rows.length) } : { ...k, value: rows.length ? k.value : "0" },
    );
  },

  async calculateRoute(stops) {
    await mockDelay(100);
    let distanceKm = 0;
    for (let i = 1; i < stops.length; i++) {
      const a = stops[i - 1]!;
      const b = stops[i]!;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const x =
        Math.sin(dLat / 2) ** 2 +
        Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
      distanceKm += 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
    distanceKm = Math.round(distanceKm * 100) / 100;
    return {
      distanceKm,
      durationMin: Math.round(distanceKm * 3 + stops.length * 2),
      sequence: stops.map((s, i) => s.id || `stop-${i + 1}`),
      provider: "haversine",
    };
  },

  async applyAction({ route, ids, action, values, by }) {
    await mockDelay(240);
    const screen = OPS_SCREENS[route]!;
    const form = actionForm(action);
    if (form) {
      const missing = form.fields.find((f) => f.required && !(values[f.id] ?? "").trim());
      if (missing) throw new MockApiError(`${missing.label} is required`);
    }
    const effect = OPS_EFFECTS[route]?.[action];
    const last = screen.columns.length - 1;
    const before = read(route);
    // A record that has reached an end state can still be viewed, called or exported, but nothing
    // may move it again (e.g. dispatching a completed batch, delivering a delivered stop).
    if (effect?.status && !AFTER_CLOSE.test(action)) {
      const closed = ids.filter((id) => TERMINAL.test(cellText(findRow(before, id)?.[last])));
      if (closed.length) {
        const which = closed.map((id) => `${id} (${cellText(findRow(before, id)?.[last])})`).join(", ");
        throw new MockApiError(`${action} isn't possible — already closed: ${which}. Nothing was changed.`);
      }
    }
    let state = before;
    if (effect) {
      state = mapRows(state, ids, (row) => {
        if (effect.remove) return null;
        const next = [...row];
        for (const [col, fn] of Object.entries(effect.set ?? {})) next[Number(col)] = fn(values, row) || cellText(row[Number(col)]);
        if (effect.status) {
          const [label, tone] = typeof effect.status === "function" ? effect.status(values) : effect.status;
          next[last] = { label, tone };
        }
        return next;
      });
    }
    const labels = Object.fromEntries((form?.fields ?? []).map((f) => [f.id, f.label]));
    const note = summary(values, labels);
    const stage = { ...state.stage };
    const log = { ...state.log };
    for (const id of ids) {
      if (form?.advances && screen.flow.length) {
        // Advance from where the record was before this action changed its status.
        stage[id] = Math.min((stage[id] ?? defaultStage(screen, findRow(before, id))) + 1, screen.flow.length - 1);
      }
      log[id] = [logEntry(action, by, note || undefined), ...(log[id] ?? [])];
    }
    return write(route, { ...state, stage, log });
  },

  async saveRecord({ route, tab, id, row, by, note }) {
    await mockDelay(220);
    const screen = OPS_SCREENS[route]!;
    const newId = recordId(row);
    if (!newId || newId === "—") throw new MockApiError(`${screen.columns[0]} is required`);
    let state = read(route);
    if (id) {
      state = mapRows(state, [id], (old) => row.map((cell, i) => (cell === "" ? old[i] ?? "—" : cell)));
    } else {
      if (Object.values(state.rows).some((list) => list.some((r) => recordId(r) === newId))) {
        throw new MockApiError(`${screen.entity} ${newId} already exists`);
      }
      const target = screen.tabs.includes(tab) ? tab : screen.tabs[0]!;
      const first = screen.tabs[0]!;
      state = {
        ...state,
        rows: {
          ...state.rows,
          [first]: [row, ...(state.rows[first] ?? [])],
          ...(target !== first ? { [target]: [row, ...(state.rows[target] ?? [])] } : {}),
        },
      };
    }
    // History follows the record even when its identifying column was renamed.
    const prior = state.log[id ?? newId] ?? [];
    const log = { ...state.log, [newId]: [logEntry(id ? "Record updated" : "Record created", by, note), ...prior] };
    return write(route, { ...state, log });
  },

  async deleteRecord(route, id) {
    await mockDelay(200);
    const state = mapRows(read(route), [id], () => null);
    const log = { ...state.log };
    delete log[id];
    return write(route, { ...state, log });
  },

  async advanceStage(route, id, by) {
    await mockDelay(160);
    const screen = OPS_SCREENS[route]!;
    const state = read(route);
    const cur = state.stage[id] ?? defaultStage(screen, findRow(state, id));
    const next = Math.min(cur + 1, screen.flow.length - 1);
    const stepName = screen.flow[next]?.label ?? "Next stage";
    return write(route, {
      ...state,
      stage: { ...state.stage, [id]: next },
      log: { ...state.log, [id]: [logEntry(`${stepName} recorded`, by), ...(state.log[id] ?? [])] },
    });
  },
};
