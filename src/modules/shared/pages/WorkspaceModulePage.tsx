import { useLocation } from "react-router-dom";
import { Download } from "lucide-react";
import { MODULE_BREADCRUMBS, type ModuleId } from "@/constants/nav";
import { useWorkspaceConfig } from "@/modules/shared/hooks/useWorkspaceConfig";
import { Workspace } from "@/components/workspace/Workspace";
import { Button } from "@/components/ui/Button";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { ErrorState, EmptyState } from "@/components/ui/EmptyState";
import { useUiStore } from "@/store/uiStore";
import { usePermission } from "@/hooks/usePermission";
import type { WorkspaceCell } from "@/types/common";

function cellText(cell: WorkspaceCell): string {
  if (cell == null) return "";
  if (typeof cell === "string") return cell;
  return cell.label;
}

/**
 * Serves every route whose approved-design layout is the shared list-view template (see
 * workspaceData.ts) — one component, one config per module, real per-module data and actions.
 */
export function WorkspaceModulePage() {
  const location = useLocation();
  const moduleId = location.pathname.slice(1).split("/")[0] as ModuleId;
  const breadcrumb = MODULE_BREADCRUMBS[moduleId];
  const pushToast = useUiStore((s) => s.pushToast);
  const { can } = usePermission();

  const { data: config, isLoading, isError, refetch } = useWorkspaceConfig(moduleId);

  if (isLoading) return <CardSkeleton />;
  if (isError) {
    return <ErrorState message={`Couldn't load ${breadcrumb?.[1] ?? moduleId}.`} onRetry={() => refetch()} />;
  }
  if (!config) {
    return <EmptyState title="No data configured for this module yet" />;
  }

  function exportCsv() {
    const tab = config!.tabs[0] ?? "";
    const rows = config!.rows[tab] ?? Object.values(config!.rows)[0] ?? [];
    const header = config!.columns;
    const lines = [
      header.map((h) => `"${h.replace(/"/g, '""')}"`).join(","),
      ...rows.map((row) =>
        row.map((cell) => `"${cellText(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${moduleId}-${tab || "export"}.csv`.replace(/\s+/g, "-").toLowerCase();
    a.click();
    URL.revokeObjectURL(url);
    pushToast(`Exported ${rows.length} rows`, "success");
  }

  return (
    <Workspace
      config={config}
      moduleId={moduleId}
      searchPlaceholder={`Search ${(breadcrumb?.[1] ?? "records").toLowerCase()}…`}
      toolbar={
        can(moduleId, "export") ? (
          <Button size="sm" onClick={exportCsv}>
            <Download size={13} /> Export
          </Button>
        ) : undefined
      }
    />
  );
}
