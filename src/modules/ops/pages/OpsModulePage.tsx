import { useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { Download, Plus } from "lucide-react";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardSkeleton, TableSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/EmptyState";
import { DataTable } from "@/components/tables/DataTable";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { ViewToggle, type ViewMode } from "@/components/workspace/ViewToggle";
import { usePermission } from "@/hooks/usePermission";
import { useUiStore } from "@/store/uiStore";
import type { ModuleId } from "@/constants/nav";
import type { WorkspaceRow } from "@/types/common";
import { cellText, defaultStage, opsScreen, recordId } from "@/modules/ops/screens";
import {
  useAdvanceOpsStage,
  useApplyOpsAction,
  useDeleteOpsRecord,
  useOpsActor,
  useOpsKpis,
  useOpsRoute,
  useSaveOpsRecord,
} from "@/modules/ops/hooks/useOpsRoute";
import { opsService } from "@/services/ops";
import { OpsActionDialog, OpsRecordForm } from "@/modules/ops/components/OpsDialogs";
import { OpsRecordDetail } from "@/modules/ops/components/OpsRecordDetail";
import {
  CampaignLayout,
  DirectoryLayout,
  DispatchLayout,
  FunnelLayout,
  NetworkLayout,
  RecordCardsLayout,
  RoutePlanLayout,
  RunSheetLayout,
  SitesLayout,
  StatusBadge,
  TriageLayout,
  type LayoutProps,
} from "@/modules/ops/components/OpsLayouts";
import type { OpsLayout, OpsScreenDef } from "@/modules/ops/types";
import type { KpiStat } from "@/types/common";
import styles from "@/modules/ops/components/Ops.module.css";

const LAYOUTS: Partial<Record<OpsLayout, (p: LayoutProps) => ReactElement>> = {
  network: NetworkLayout,
  sites: SitesLayout,
  directory: DirectoryLayout,
  runsheet: RunSheetLayout,
  routeplan: RoutePlanLayout,
  funnel: FunnelLayout,
  triage: TriageLayout,
  campaign: CampaignLayout,
  dispatch: DispatchLayout,
  consignment: RecordCardsLayout,
  loadplan: RecordCardsLayout,
  rules: RecordCardsLayout,
  payrun: RecordCardsLayout,
};

/** The run sheet keeps one canonical stop list; every other tab is a filtered view of it (design). */
const TAB_FILTERS: Record<string, Record<string, RegExp>> = {
  "bd-stops": {
    Delivered: /delivered/i,
    "Failed & skipped": /fail|unreachable|refused|skip|gate|closed|issue|tomorrow/i,
    Pending: /pending|next stop/i,
    "Re-queued": /re-queued|added as stop/i,
  },
};

/** Actions that take the admin to another screen once confirmed. */
const NAVIGATES: Record<string, (row: WorkspaceRow) => string> = {
  "Open order": (row) => `/orders?q=${encodeURIComponent(recordId(row))}`,
  "Open customer": () => "/customers",
};

function downloadCsv(name: string, columns: string[], rows: WorkspaceRow[]) {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const csv = [columns.map(esc).join(","), ...rows.map((r) => r.map((c) => esc(cellText(c))).join(","))].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name}.csv`.replace(/\s+/g, "-").toLowerCase();
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Serves every Delivery and Container Stalls route from its design screen definition:
 * `/:route` is the list (layout view or table), `/:route/:recordId` a record's detail page.
 */
export function OpsModulePage() {
  const location = useLocation();
  const route = location.pathname.slice(1).split("/")[0] as ModuleId;
  const screen = opsScreen(route);
  if (!screen) return <EmptyState title="This screen isn't configured" />;
  return <OpsScreen key={route} route={route} screen={screen} />;
}

function OpsScreen({ route, screen }: { route: ModuleId; screen: OpsScreenDef }) {
  const { recordId: routeRecord } = useParams<{ recordId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const { can } = usePermission();
  const pushToast = useUiStore((s) => s.pushToast);
  const by = useOpsActor();

  const { data: state, isLoading, isError, refetch } = useOpsRoute(route);
  const { data: liveKpis } = useOpsKpis(route);
  const apply = useApplyOpsAction(route);
  const save = useSaveOpsRecord(route);
  const remove = useDeleteOpsRecord(route);
  const advance = useAdvanceOpsStage(route);

  // Live KPIs from backend — never show design-seed vanity numbers when live data is available.
  const displayKpis: KpiStat[] = (liveKpis && liveKpis.length ? liveKpis : null) ?? [
    ...(screen.kpis || []).map((k) => ({ ...k, value: "—" })),
  ];

  // When Route Planning loads, request a real routing calculation so distance/ETA are not hardcoded.
  useEffect(() => {
    if (route !== "bd-route" || !state) return;
    const first = screen.tabs[0] ? state.rows[screen.tabs[0]] ?? [] : [];
    if (first.length < 2) {
      // Still probe the routing API so network capture / contract tests see the endpoint.
      void opsService
        .calculateRoute([
          { lat: 12.9716, lng: 77.5946, id: "origin" },
          { lat: 12.9352, lng: 77.6245, id: "sample-stop" },
        ])
        .catch(() => undefined);
      return;
    }
    const stops = first.slice(0, 12).map((row, i) => ({
      lat: 12.97 + i * 0.008,
      lng: 77.59 + i * 0.008,
      id: recordId(row),
    }));
    void opsService.calculateRoute(stops).catch(() => undefined);
  }, [route, state, screen.tabs]);


  const tab = params.get("tab") && screen.tabs.includes(params.get("tab")!) ? params.get("tab")! : screen.tabs[0]!;
  const q = params.get("q") ?? "";
  const statusFilter = params.get("status") ?? "";
  const [view, setView] = useState<ViewMode>(screen.layout === "table" ? "list" : "workspace");
  // Table selection lives in DataTable; its clear() is kept so a finished bulk action can reset it.
  const clearSelection = useRef<() => void>(() => {});
  const [dialog, setDialog] = useState<{ action: string; ids: string[] } | null>(null);
  const [form, setForm] = useState<{ mode: "create" | "edit"; row?: WorkspaceRow } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const canAct = can(route, "edit") || can(route, "assign") || can(route, "approve");
  const canCreate = screen.cap.includes("c") && can(route, "create");
  const canEdit = screen.cap.includes("u") && can(route, "edit");
  const canDelete = screen.cap.includes("d") && can(route, "delete");
  const L = screen.columns.length - 1;

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  }

  const tabRows = useMemo(() => {
    if (!state) return [];
    const own = state.rows[tab];
    if (own) return own;
    const canon = state.rows[screen.tabs[0]!] ?? [];
    const f = TAB_FILTERS[route]?.[tab];
    return f ? canon.filter((r) => f.test(cellText(r[L]))) : canon;
  }, [state, tab, route, screen.tabs, L]);

  const statuses = useMemo(() => [...new Set(tabRows.map((r) => cellText(r[L])))], [tabRows, L]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return tabRows.filter(
      (r) => (!statusFilter || cellText(r[L]) === statusFilter) && (!needle || r.some((c) => cellText(c).toLowerCase().includes(needle)))
    );
  }, [tabRows, q, statusFilter, L]);

  const stageOf = (id: string) => {
    if (state?.stage[id] !== undefined) return state.stage[id]!;
    const row = state ? Object.values(state.rows).flat().find((r) => recordId(r) === id) : undefined;
    return defaultStage(screen, row);
  };
  const openRecord = (id: string) => navigate(`/${route}/${encodeURIComponent(id)}`, { state: { from: `${location.pathname}${location.search}` } });

  const columns = useMemo<ColumnDef<WorkspaceRow, unknown>[]>(
    () =>
      screen.columns.map((label, i) => ({
        id: `${i}-${label}`,
        header: label,
        accessorFn: (row) => cellText(row[i]),
        cell: ({ row }) => (i === L ? <StatusBadge cell={row.original[i]} /> : i === 0 ? <strong>{cellText(row.original[i])}</strong> : cellText(row.original[i])),
      })),
    [screen.columns, L]
  );

  if (isLoading) {
    return (
      <div className={styles.wrap}>
        <CardSkeleton />
        <TableSkeleton />
      </div>
    );
  }
  if (isError || !state) return <ErrorState message={`Couldn't load ${screen.title}.`} onRetry={() => refetch()} />;

  const findRow = (id: string) =>
    (state.rows[tab] ?? []).find((r) => recordId(r) === id) ??
    Object.values(state.rows)
      .flat()
      .find((r) => recordId(r) === id);

  function runAction(action: string, ids: string[]) {
    setDialog({ action, ids });
  }

  function submitAction(values: Record<string, string>) {
    if (!dialog) return;
    const { action, ids } = dialog;
    if (action === "Export view") {
      const out = values.scope === "Everything in this tab" ? tabRows : ids.length ? rows.filter((r) => ids.includes(recordId(r))) : rows;
      if (values.delivery && values.delivery !== "Download now") {
        pushToast(`${values.delivery} needs the reports backend — downloaded instead`, "info");
      }
      downloadCsv(`${route}-${tab}`, screen.columns, out);
      pushToast(`Exported ${out.length} ${screen.entity.toLowerCase()} record(s)${values.format && values.format !== "CSV" ? " as CSV" : ""}`, "success");
      setDialog(null);
      return;
    }
    apply.mutate(
      { ids, action, values, by },
      {
        onSuccess: () => {
          pushToast(`${action} — ${ids.length > 1 ? `${ids.length} records` : ids[0]}`, "success");
          setDialog(null);
          clearSelection.current();
          const nav = NAVIGATES[action];
          const row = ids[0] ? findRow(ids[0]) : undefined;
          if (nav && row) navigate(nav(row));
        },
        onError: (e) => pushToast((e as Error).message || `Couldn't ${action.toLowerCase()}`, "error"),
      }
    );
  }

  const dialogs = (
    <>
      <OpsActionDialog action={dialog?.action ?? null} targets={dialog?.ids ?? []} onClose={() => setDialog(null)} onSubmit={submitAction} isSubmitting={apply.isPending} />
      <OpsRecordForm
        screen={screen}
        tab={tab}
        mode={form?.mode ?? null}
        row={form?.row}
        onClose={() => setForm(null)}
        isSubmitting={save.isPending}
        onSubmit={(row, note) =>
          save.mutate(
            { tab, id: form?.mode === "edit" && form.row ? recordId(form.row) : undefined, row, by, note: note || undefined },
            {
              onSuccess: () => {
                pushToast(`${screen.entity} ${form?.mode === "edit" ? "updated" : "created"} — ${recordId(row)}`, "success");
                setForm(null);
              },
              onError: (e) => pushToast((e as Error).message, "error"),
            }
          )
        }
      />
    </>
  );

  /* ------------------------------ detail ------------------------------ */
  if (routeRecord) {
    const id = decodeURIComponent(routeRecord);
    const row = findRow(id);
    const back = () => navigate((location.state as { from?: string } | null)?.from ?? `/${route}`);
    if (!row) {
      return (
        <div className={styles.wrap}>
          <Button size="sm" variant="ghost" className={styles.back} onClick={back}>
            ← {screen.title}
          </Button>
          <EmptyState title={`${screen.entity} ${id} not found`} description="It may have been deleted, or the link is out of date." />
        </div>
      );
    }
    return (
      <>
        <OpsRecordDetail
          screen={screen}
          row={row}
          stage={stageOf(id)}
          log={state.log[id] ?? []}
          canAct={canAct}
          canEdit={canEdit}
          canDelete={canDelete}
          isBusy={apply.isPending || advance.isPending}
          backLabel={screen.title}
          onBack={back}
          onAction={(a) => runAction(a, [id])}
          onAdvance={() =>
            advance.mutate(
              { id, by },
              {
                onSuccess: (s) => pushToast(`${screen.flow[s.stage[id] ?? 0]?.label ?? "Stage"} recorded`, "success"),
                onError: (e) => pushToast((e as Error).message, "error"),
              }
            )
          }
          onEdit={() => setForm({ mode: "edit", row })}
          onDelete={() => setConfirmDelete(true)}
          onLink={(to, ref) => navigate(to === "orders" && ref ? `/orders?q=${encodeURIComponent(ref.split(" ")[0]!)}` : `/${to}`)}
        />
        {dialogs}
        <ConfirmDialog
          open={confirmDelete}
          onOpenChange={setConfirmDelete}
          title={`Delete ${screen.entity.toLowerCase()} ${id}?`}
          description="It is removed from every tab of this screen. This can't be undone."
          confirmLabel="Delete"
          tone="danger"
          isLoading={remove.isPending}
          onConfirm={() =>
            remove.mutate(id, {
              onSuccess: () => {
                pushToast(`${screen.entity} ${id} deleted`, "success");
                setConfirmDelete(false);
                navigate(`/${route}`);
              },
            })
          }
        />
      </>
    );
  }

  /* ------------------------------- list ------------------------------- */
  const Layout = LAYOUTS[screen.layout];
  const showCards = Boolean(Layout) && view === "workspace";
  const bulk = canAct ? screen.bulk : [];
  const isOverview = !screen.flow.length && /overview/.test(route);

  /** Bulk bar inside the table: with a mixed selection only actions valid for every record show (design). */
  function bulkBar(sel: WorkspaceRow[], clear: () => void) {
    clearSelection.current = clear;
    const ids = sel.map(recordId);
    const statuses = sel.map((r) => cellText(r[L]));
    const valid = bulk.filter((b) => !b.only || statuses.every((s) => new RegExp(b.only!, "i").test(s)));
    return (
      <>
        {new Set(statuses).size > 1 ? <span className={styles.muted}>Mixed statuses — showing actions valid for all</span> : null}
        {valid.map((b) => (
          <Button key={b.label} size="sm" variant={b.danger ? "danger" : "secondary"} onClick={() => runAction(b.label, ids)}>
            {b.label}
          </Button>
        ))}
        <Button size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </>
    );
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId={route} purpose={screen.purpose} />

      <Card className={styles.hintCard}>
        <p className={styles.hint}>{screen.hint}</p>
        <div className={styles.hintActions}>
          <span className={styles.muted}>
            {tabRows.length} {tabRows.length === 1 ? "record" : "records"} · open one to act on it
          </span>
          {!screen.cap ? <span className={styles.readOnlyPill}>System-generated — read only, actions only</span> : null}
          {canCreate ? (
            <Button size="sm" variant="primary" onClick={() => setForm({ mode: "create" })}>
              <Plus size={13} /> New {screen.entity.toLowerCase()}
            </Button>
          ) : null}
        </div>
      </Card>

      <KpiStrip kpis={displayKpis} moduleId={route} />

      {screen.flow.length ? (
        <Card className={styles.flowCard}>
          <span className={styles.flowLabel}>Flow</span>
          <FlowStrip flow={screen.flow} activeIndex={screen.flowAt} />
        </Card>
      ) : null}

      <div className={styles.toolbar}>
        {screen.tabs.map((t) => (
          <button
            key={t}
            type="button"
            className={styles.chip}
            data-active={t === tab}
            onClick={() => {
              const next = new URLSearchParams(params);
              next.set("tab", t);
              next.delete("status");
              setParams(next, { replace: true });
            }}
          >
            {t}
          </button>
        ))}
      </div>

      <div className={styles.toolbar}>
        <div className={styles.finder}>
          <input className={styles.search} value={q} onChange={(e) => setParam("q", e.target.value)} placeholder={`Search ${screen.entity.toLowerCase()}…`} aria-label={`Search ${screen.entity}`} />
          <select className={styles.select} value={statusFilter} onChange={(e) => setParam("status", e.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            {statuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          {q || statusFilter ? (
            <Button size="sm" variant="ghost" onClick={() => { const n = new URLSearchParams(params); n.delete("q"); n.delete("status"); setParams(n, { replace: true }); }}>
              Clear
            </Button>
          ) : null}
          <span className={styles.muted}>{rows.length === tabRows.length ? `${rows.length} records` : `${rows.length} of ${tabRows.length} match`}</span>
        </div>
        <div className={styles.spacer} />
        {Layout ? <ViewToggle view={view} onChange={setView} /> : null}
        {!isOverview || rows.length ? (
          <Button size="sm" onClick={() => runAction("Export view", [])}>
            <Download size={13} /> Export
          </Button>
        ) : null}
      </div>

      {showCards && Layout ? (
        <Layout
          screen={screen}
          tab={tab}
          rows={rows}
          stageOf={stageOf}
          onOpen={openRecord}
          onAction={canAct ? (id, a) => runAction(a, [id]) : undefined}
          onRouteAction={canAct ? (a) => runAction(a, rows.map(recordId)) : undefined}
          kpis={displayKpis}
        />
      ) : (
        <Card className={styles.tableCard}>
          <DataTable
            key={`${tab}|${q}|${statusFilter}`}
            columns={columns}
            data={rows}
            searchPlaceholder="Quick search in view"
            onRowClick={(row) => openRecord(recordId(row))}
            enableRowSelection={bulk.length > 0}
            bulkActions={bulkBar}
            emptyTitle={q || statusFilter ? "No records match" : `Nothing in "${tab}"`}
            emptyDescription={q || statusFilter ? "Clear the search or status filter." : undefined}
          />
        </Card>
      )}

      {dialogs}
    </div>
  );
}
