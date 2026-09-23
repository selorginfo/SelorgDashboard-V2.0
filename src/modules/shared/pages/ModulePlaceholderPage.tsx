import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { MODULE_BREADCRUMBS, type ModuleId } from "@/constants/nav";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useUiStore } from "@/store/uiStore";
import {
  endpointsForModule,
  invokeCatalogEndpoint,
  type CatalogEndpoint,
} from "@/services/system/dashboardApiCatalog";
import styles from "./ModulePlaceholderPage.module.css";

/**
 * Modules without a bespoke screen still call the live backend: related catalog
 * GET endpoints load on mount, and any related method can be run from this page.
 */
export function ModulePlaceholderPage() {
  const location = useLocation();
  const moduleId = location.pathname.slice(1).split("/")[0] as ModuleId;
  const breadcrumb = MODULE_BREADCRUMBS[moduleId];
  const endpoints = useMemo(() => endpointsForModule(moduleId), [moduleId]);
  const pushToast = useUiStore((s) => s.pushToast);
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState("");

  useEffect(() => {
    const gets = endpoints.filter((e) => e.method === "GET").slice(0, 4);
    if (gets.length === 0) return;
    let cancelled = false;
    (async () => {
      const parts: string[] = [];
      for (const ep of gets) {
        try {
          const data = await invokeCatalogEndpoint(ep);
          if (cancelled) return;
          parts.push(`${ep.method} ${ep.path}\n${JSON.stringify(data, null, 2).slice(0, 1200)}`);
        } catch (err) {
          if (cancelled) return;
          parts.push(`${ep.method} ${ep.path}\n${(err as Error).message}`);
        }
      }
      setLast(parts.join("\n\n"));
    })();
    return () => {
      cancelled = true;
    };
  }, [endpoints, moduleId]);

  async function run(ep: CatalogEndpoint) {
    const key = `${ep.method} ${ep.path}`;
    if (busy) return;
    setBusy(key);
    try {
      const result = await invokeCatalogEndpoint(ep, ep.method === "GET" || ep.method === "DELETE" ? undefined : {});
      setLast(JSON.stringify(result, null, 2).slice(0, 4000));
      pushToast(`${ep.method} ${ep.path} succeeded`, "success");
    } catch (err) {
      const msg = (err as Error).message || "Request failed";
      setLast(msg);
      pushToast(`${ep.method} ${ep.path}: ${msg}`, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className={styles.card}>
      <div className={styles.tag}>Live backend module</div>
      <div className={styles.title}>{breadcrumb?.[1] ?? moduleId}</div>
      <p className={styles.desc}>
        This screen is wired to {endpoints.length} related backend endpoints. GET probes run on
        load; use Run to call any of them against the live API.
      </p>
      <div className={styles.meta}>
        <Badge label={`${endpoints.length} endpoints`} />
      </div>
      <ul className={styles.list}>
        {endpoints.slice(0, 24).map((ep) => {
          const key = `${ep.method} ${ep.path}`;
          return (
            <li key={key} className={styles.row}>
              <span className={styles.method}>{ep.method}</span>
              <span className={styles.path}>{ep.path}</span>
              <Button size="sm" onClick={() => run(ep)} disabled={busy === key}>
                {busy === key ? "Running…" : "Run"}
              </Button>
            </li>
          );
        })}
      </ul>
      {endpoints.length > 24 ? <p className={styles.more}>Showing 24 of {endpoints.length}. Open API catalog for the rest.</p> : null}
      <pre className={styles.pre}>{last || "Waiting for the first live response…"}</pre>
    </Card>
  );
}
