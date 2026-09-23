import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { KpiStrip } from "@/components/ui/KpiStrip";
import { Tabs } from "@/components/ui/Tabs";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { DataTable } from "@/components/tables/DataTable";
import { FlowStrip } from "@/components/workspace/FlowStrip";
import { ChartPanel } from "@/components/workspace/ChartPanel";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import { canCreate, entityLabel, isReadOnlyModule, READ_ONLY_TABS } from "@/constants/recordCapabilities";
import { endpointsForModule, invokeCatalogEndpoint } from "@/services/system/dashboardApiCatalog";
import { useUiStore } from "@/store/uiStore";
import type { ModuleId } from "@/constants/nav";
import type { WorkspaceConfig, WorkspaceRow } from "@/types/common";
import styles from "./Workspace.module.css";

/**
 * The shared shell behind the ~8 routes the approved design itself specifies as a plain table
 * (see plan §"Route → screen mapping" and the definitive route→batch mapping) — hint + rowCount/
 * read-only-pill/create-button header, KPI cards, an optional chart pair, an optional flow strip,
 * then a tab-filtered table. Each module supplies its own WorkspaceConfig; the header's
 * create/read-only treatment is derived from the design's own ENTITY/CAP maps
 * (src/constants/recordCapabilities.ts), not invented per module.
 */
export function Workspace({
  config,
  moduleId,
  isLoading,
  onRowClick,
  toolbar,
  searchPlaceholder,
}: {
  config: WorkspaceConfig;
  moduleId: ModuleId;
  isLoading?: boolean;
  onRowClick?: (row: WorkspaceRow) => void;
  toolbar?: ReactNode;
  searchPlaceholder?: string;
}) {
  const [tab, setTab] = useState(config.tabs[0] ?? "");
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [creating, setCreating] = useState(false);
  const pushToast = useUiStore((s) => s.pushToast);

  const rows = config.rows[tab] ?? [];
  const entity = entityLabel(moduleId);
  const showCreate = canCreate(moduleId) && !READ_ONLY_TABS.has(tab);
  const showReadOnlyPill = isReadOnlyModule(moduleId) || READ_ONLY_TABS.has(tab);

  const columns = useMemo<ColumnDef<WorkspaceRow, unknown>[]>(
    () =>
      config.columns.map((label, i) => ({
        id: `${label}-${i}`,
        header: label,
        accessorFn: (row) => cellSortValue(row[i]),
        cell: ({ row }) => renderCell(row.original[i]),
      })),
    [config.columns]
  );

  async function submitCreate() {
    setCreating(true);
    try {
      const body: Record<string, string> = Object.fromEntries(
        Object.entries(draft)
          .map(([k, v]) => [toApiKey(k), v.trim()] as const)
          .filter(([, v]) => Boolean(v))
      );
      if (Object.keys(body).length === 0) {
        pushToast("Fill at least one field before creating", "info");
        return;
      }

      const posts = endpointsForModule(moduleId).filter(
        (ep) => ep.method === "POST" && !ep.path.includes(":")
      );
      const preferred =
        posts.find((ep) => /\/zones$|\/vehicles$|\/fleet\/vehicles$|\/coupons$/.test(ep.path)) ??
        posts[0];
      if (!preferred) {
        pushToast(`No create API mapped for ${entity}`, "error");
        return;
      }

      if (moduleId === "zones" && !body.cityId && !body.city_id) {
        body.cityId = "000000000000000000000001";
      }
      if (moduleId === "zones" && !body.name) {
        body.name = body.code || body.title || `Zone ${Date.now().toString(36)}`;
      }

      await invokeCatalogEndpoint(preferred, body);
      setCreateOpen(false);
      setDraft({});
      pushToast(`${entity} created via ${preferred.method} ${preferred.path}`, "success");
    } catch (err) {
      pushToast((err as Error).message || `Couldn't create ${entity.toLowerCase()}`, "error");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId={moduleId} flow={config.flow} activeIndex={config.flowAt} />

      <Card className={styles.hintCard}>
        <div className={styles.hintRow}>
          <p className={styles.hint}>{config.hint}</p>
          <div className={styles.hintActions}>
            <span className={styles.rowCount}>{rows.length} records · click a row to open its flow</span>
            {showReadOnlyPill ? (
              <span className={styles.readOnlyPill}>
                {isReadOnlyModule(moduleId)
                  ? "System-generated records — read only, actions only"
                  : "This log is immutable"}
              </span>
            ) : null}
            {showCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                + New {entity.toLowerCase()}
              </Button>
            ) : null}
          </div>
        </div>
      </Card>

      <KpiStrip kpis={config.kpis} moduleId={moduleId} />

      {config.chart ? <ChartPanel chart={config.chart} /> : null}

      {config.flow.length > 0 ? (
        <Card className={styles.flowCard}>
          <span className={styles.flowLabel}>Flow</span>
          <FlowStrip flow={config.flow} activeIndex={config.flowAt} />
        </Card>
      ) : null}

      <Card>
        <div className={styles.tabsRow}>
          <Tabs value={tab} onValueChange={setTab} tabs={config.tabs} />
          {toolbar}
        </div>
        <DataTable
          columns={columns}
          data={rows}
          isLoading={isLoading}
          searchPlaceholder={searchPlaceholder ?? "Search"}
          onRowClick={onRowClick}
          emptyTitle={`No ${tab.toLowerCase()} yet`}
        />
      </Card>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title={`New ${entity.toLowerCase()}`}
        footer={
          <Button variant="primary" isLoading={creating} onClick={() => void submitCreate()}>
            Create {entity.toLowerCase()}
          </Button>
        }
      >
        <div className={styles.createForm}>
          {config.columns.slice(0, -1).map((label) => (
            <label key={label} className={styles.createField}>
              <span className={styles.createLabel}>{label}</span>
              <Input
                value={draft[label] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [label]: e.target.value }))}
              />
            </label>
          ))}
        </div>
      </Dialog>
    </div>
  );
}

function toApiKey(label: string): string {
  return label
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/[^a-zA-Z0-9]/g, "")
    .replace(/^(.)/, (c) => c.toLowerCase());
}

function cellSortValue(cell: WorkspaceRow[number] | undefined): string {
  if (cell === undefined) return "";
  return typeof cell === "string" ? cell : cell.label;
}

function renderCell(cell: WorkspaceRow[number] | undefined) {
  if (cell === undefined) return null;
  if (typeof cell === "string") return cell;
  return <Badge label={cell.label} tone={cell.tone} />;
}
