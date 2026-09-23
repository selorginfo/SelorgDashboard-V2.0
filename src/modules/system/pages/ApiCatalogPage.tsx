import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useUiStore } from "@/store/uiStore";
import {
  DASHBOARD_API_CATALOG,
  namespaceOf,
  invokeCatalogEndpoint,
  type CatalogEndpoint,
} from "@/services/system/dashboardApiCatalog";
import styles from "./ApiCatalogPage.module.css";

export function ApiCatalogPage() {
  const [ns, setNs] = useState("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [last, setLast] = useState<string>("");
  const pushToast = useUiStore((s) => s.pushToast);

  const namespaces = useMemo(() => {
    const set = new Set(DASHBOARD_API_CATALOG.map((e) => namespaceOf(e.path)));
    return ["all", ...[...set].sort()];
  }, []);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return DASHBOARD_API_CATALOG.filter((e) => {
      if (ns !== "all" && namespaceOf(e.path) !== ns) return false;
      if (!query) return true;
      return `${e.method} ${e.path}`.toLowerCase().includes(query);
    });
  }, [ns, q]);

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
    <div className={styles.wrap}>
      <Card className={styles.header}>
        <div>
          <div className={styles.kicker}>Dashboard ↔ backend integration</div>
          <h1 className={styles.title}>API catalog</h1>
          <p className={styles.lede}>
            {DASHBOARD_API_CATALOG.length} admin-facing endpoints are live on the Selorg backend.
            Filter by namespace and run any of them against the configured API.
          </p>
        </div>
        <div className={styles.controls}>
          <select value={ns} onChange={(e) => setNs(e.target.value)} className={styles.select}>
            {namespaces.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <input
            className={styles.search}
            placeholder="Search method or path"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Badge label={`${rows.length} shown`} />
        </div>
      </Card>

      <div className={styles.grid}>
        <Card className={styles.listCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Method</th>
                <th>Path</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 400).map((ep) => {
                const key = `${ep.method} ${ep.path}`;
                return (
                  <tr key={key}>
                    <td>
                      <span className={styles.method}>{ep.method}</span>
                    </td>
                    <td className={styles.path}>{ep.path}</td>
                    <td>
                      <Button size="sm" onClick={() => run(ep)} disabled={busy === key}>
                        {busy === key ? "Running…" : "Run"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length > 400 ? <p className={styles.more}>Showing first 400 — narrow the filter to see the rest.</p> : null}
        </Card>
        <Card className={styles.resultCard}>
          <div className={styles.resultLabel}>Last response</div>
          <pre className={styles.pre}>{last || "Run an endpoint to see the live backend response."}</pre>
        </Card>
      </div>
    </div>
  );
}
