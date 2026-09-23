import { useRef, useState, useEffect } from "react";
import {
  Upload, Download, FileSpreadsheet, Loader,
  CheckCircle, AlertCircle, Clock, ChevronDown, ChevronRight, X, History,
} from "lucide-react";
import { PurposeBanner } from "@/components/workspace/PurposeBanner";
import {
  prepareUpload, processSheet, downloadMastersheetTemplate,
  finalizeUpload, fetchUploadHistory, fetchActiveVersion,
} from "@/services/catalog/mastersheetService";
import type {
  SheetKey, SheetResult, UploadHistoryRecord, FinalizeResult,
} from "@/services/catalog/mastersheetService";
import styles from "./MasterSheetPage.module.css";

/* ── Constants ─────────────────────────────────────────────────────── */
const MAX_FILE_BYTES = 30 * 1024 * 1024;

const SHEET_ORDER: SheetKey[] = [
  "sku-master",
  "categories",
  "category-display-image",
  "banner-details",
  "home-page-content",
  "subcategories",
];

const SHEET_LABELS: Record<SheetKey, string> = {
  "sku-master": "SKU Master",
  categories: "Categories",
  "category-display-image": "Category Display Image",
  "banner-details": "Banner Details",
  "home-page-content": "Home Page Content",
  subcategories: "Subcategories",
};

function sheetDisplayName(key: SheetKey): string {
  return SHEET_LABELS[key];
}

/* ── Types ─────────────────────────────────────────────────────────── */
type SheetStatus = "waiting" | "processing" | "done" | "error" | "skipped-all";

interface SheetState {
  status: SheetStatus;
  result: SheetResult | null;
  error: string | null;
  expanded: "skipped" | "errors" | null;
}

/* ── Sheet row component ────────────────────────────────────────────── */
function SheetRow({ sheetKey, state, onToggle }: {
  sheetKey: SheetKey;
  state: SheetState;
  onToggle: (section: "skipped" | "errors") => void;
}) {
  const { status, result, error, expanded } = state;
  const label = SHEET_LABELS[sheetKey];

  return (
    <div className={styles.sheetRow} data-status={status}>
      {/* Status icon */}
      <div className={styles.sheetRowIcon}>
        {status === "waiting"    && <Clock size={14} className={styles.iconWaiting} />}
        {status === "processing" && <Loader size={14} className={`${styles.iconProcessing} ${styles.spin}`} />}
        {status === "done"       && <CheckCircle size={14} className={styles.iconDone} />}
        {status === "error"      && <AlertCircle size={14} className={styles.iconError} />}
        {status === "skipped-all" && <Clock size={14} className={styles.iconWaiting} />}
      </div>

      <div className={styles.sheetRowBody}>
        {/* Label + status text */}
        <div className={styles.sheetRowHeader}>
          <span className={styles.sheetRowLabel}>{label}</span>
          <span className={styles.sheetRowStatus}>
            {status === "waiting"    && "Waiting…"}
            {status === "processing" && "Processing…"}
            {status === "error"      && (error ?? "Failed")}
            {status === "skipped-all" && (error ?? "Sheet not found in file")}
            {status === "done" && result && (
              <span className={styles.statRow}>
                {result.created > 0  && <span className={styles.chip} data-t="created">+{result.created} created</span>}
                {result.updated > 0  && <span className={styles.chip} data-t="updated">↺ {result.updated} updated</span>}
                {result.skipped > 0  && (
                  <button type="button" className={`${styles.chip} ${styles.chipBtn}`} data-t="skipped"
                    onClick={() => onToggle("skipped")}>
                    {result.skipped} skipped {expanded === "skipped" ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  </button>
                )}
                {result.errors.length > 0 && (
                  <button type="button" className={`${styles.chip} ${styles.chipBtn}`} data-t="error"
                    onClick={() => onToggle("errors")}>
                    {result.errors.length} error{result.errors.length > 1 ? "s" : ""} {expanded === "errors" ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                  </button>
                )}
                {result.created === 0 && result.updated === 0 && result.errors.length === 0 && result.skipped === 0 && (
                  <span className={styles.chip} data-t="none">no rows</span>
                )}
              </span>
            )}
          </span>
        </div>

        {/* Progress bar while processing */}
        {status === "processing" && (
          <div className={styles.progressBar}>
            <div className={styles.progressFill} style={{ width: "100%" }} />
          </div>
        )}

        {/* Done: total rows summary */}
        {status === "done" && result && (
          <div className={styles.totalRows}>
            {result.totalRows} rows in sheet
            {result.errors.length > 0 && <span className={styles.errorNote}> — {result.errors.length} row{result.errors.length !== 1 ? "s" : ""} had errors</span>}
          </div>
        )}

        {/* Skipped details panel */}
        {status === "done" && result && expanded === "skipped" && result.skippedRows.length > 0 && (
          <div className={styles.detailPanel}>
            <div className={styles.detailTitle}>
              <Clock size={11} /> Skipped rows — reason for each
            </div>
            <div className={styles.detailList}>
              {result.skippedRows.slice(0, 50).map((s, i) => (
                <div key={i} className={styles.detailItem} data-type="skipped">
                  <span className={styles.rowNum}>Row {s.row}</span>
                  <span className={styles.rowRef}>{s.ref}</span>
                  <span className={styles.rowReason}>{s.reason}</span>
                </div>
              ))}
              {result.skippedRows.length > 50 && (
                <div className={styles.detailMore}>…and {result.skippedRows.length - 50} more skipped rows</div>
              )}
            </div>
          </div>
        )}

        {/* Error details panel */}
        {status === "done" && result && expanded === "errors" && result.errors.length > 0 && (
          <div className={styles.detailPanel}>
            <div className={styles.detailTitle} data-type="error">
              <AlertCircle size={11} /> Error rows — fix these and re-upload
            </div>
            <div className={styles.detailList}>
              {result.errors.slice(0, 50).map((e, i) => (
                <div key={i} className={styles.detailItem} data-type="error">
                  <span className={styles.rowNum}>Row {e.row}</span>
                  <span className={styles.rowRef}>{e.ref}</span>
                  <span className={styles.rowReason}>{e.error}</span>
                </div>
              ))}
              {result.errors.length > 50 && (
                <div className={styles.detailMore}>…and {result.errors.length - 50} more errors</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Page ──────────────────────────────────────────────────────────── */
const INIT_SHEET_STATE: SheetState = { status: "waiting", result: null, error: null, expanded: null };

export function MasterSheetPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [sheets, setSheets] = useState<Record<SheetKey, SheetState>>(
    Object.fromEntries(SHEET_ORDER.map((k) => [k, { ...INIT_SHEET_STATE }])) as Record<SheetKey, SheetState>,
  );
  const [history, setHistory] = useState<UploadHistoryRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [finalizeResult, setFinalizeResult] = useState<FinalizeResult | null>(null);
  const [activeInfo, setActiveInfo] = useState<string | null>(null);

  useEffect(() => {
    fetchUploadHistory().then(setHistory).catch(() => {}).finally(() => setHistoryLoading(false));
    fetchActiveVersion()
      .then((v) => {
        if (!v) { setActiveInfo(null); return; }
        const when = v.activatedAt
          ? new Date(v.activatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
          : "";
        setActiveInfo(`Active master: ${v.fileName}${when ? ` · ${when}` : ""}${v.contentRevisionAfter != null ? ` · rev ${v.contentRevisionAfter}` : ""}`);
      })
      .catch(() => setActiveInfo(null));
  }, []);

  function resetSheets() {
    setSheets(Object.fromEntries(SHEET_ORDER.map((k) => [k, { ...INIT_SHEET_STATE }])) as Record<SheetKey, SheetState>);
  }

  function patchSheet(key: SheetKey, patch: Partial<SheetState>) {
    setSheets((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const f = files[0]!;
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls"].includes(ext ?? "")) {
      setPageError("Only .xlsx and .xls files are supported");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setPageError("File exceeds 30 MB limit");
      return;
    }
    if (f.size === 0) {
      setPageError("Invalid Excel file — file is empty");
      return;
    }
    setFile(f);
    setPageError(null);
    setDone(false);
    setFinalizeResult(null);
    resetSheets();
  }

  async function handleUpload() {
    if (!file) return;
    setRunning(true);
    setDone(false);
    setPageError(null);
    setFinalizeResult(null);
    resetSheets();
    setCurrentStep(0);

    const finalStates: Record<SheetKey, SheetState> = Object.fromEntries(
      SHEET_ORDER.map((k) => [k, { ...INIT_SHEET_STATE }]),
    ) as Record<SheetKey, SheetState>;

    try {
      // Step 1: prepare (upload + validate required sheets/columns)
      const prepared = await prepareUpload(file);
      const { jobId, sheetsFound, versionId } = prepared;
      const warningCount = prepared.validation?.warningCount ?? prepared.validation?.warnings?.length ?? 0;
      if (warningCount > 0) {
        const sample = (prepared.validation?.warnings || []).slice(0, 3).map((w) => w.message).join('; ');
        setPageError(
          `Import started with ${warningCount} row warning(s) (duplicates / invalid cells will be upserted or skipped). ${sample}${warningCount > 3 ? '…' : ''}`,
        );
      }

      // Step 2: process each sheet sequentially into MongoDB
      for (let i = 0; i < SHEET_ORDER.length; i++) {
        const key = SHEET_ORDER[i]!;
        const sheetName = sheetDisplayName(key);

        const exists = sheetsFound.some(
          (s) => s.toLowerCase().replace(/\s+/g, "") === sheetName.toLowerCase().replace(/\s+/g, ""),
        );
        if (!exists) {
          const msg = `Required sheet "${sheetName}" not found in file`;
          patchSheet(key, { status: "skipped-all", error: msg, result: null });
          finalStates[key] = { status: "skipped-all", result: null, error: msg, expanded: null };
          continue;
        }

        setCurrentStep(i + 1);
        patchSheet(key, { status: "processing", result: null, error: null });
        finalStates[key] = { ...finalStates[key], status: "processing" };

        try {
          const result = await processSheet(jobId, key);
          patchSheet(key, { status: "done", result });
          finalStates[key] = { status: "done", result, error: null, expanded: null };
        } catch (e) {
          patchSheet(key, { status: "error", error: (e as Error).message });
          finalStates[key] = { status: "error", result: null, error: (e as Error).message, expanded: null };
          // Stop remaining sheets — failed import must not continue writing live catalog
          for (let j = i + 1; j < SHEET_ORDER.length; j++) {
            const skippedKey = SHEET_ORDER[j]!;
            const msg = `Skipped — prerequisite "${SHEET_LABELS[key]}" failed`;
            patchSheet(skippedKey, { status: "error", error: msg, result: null });
            finalStates[skippedKey] = { status: "error", result: null, error: msg, expanded: null };
          }
          break;
        }
      }

      // Step 3: activate only on full success (bumps contentRevision)
      const summaries = SHEET_ORDER.map((k) => {
        const st = finalStates[k];
        if (st.status === "done" && st.result) {
          return {
            sheetKey: k,
            totalRows: st.result.totalRows,
            created: st.result.created,
            updated: st.result.updated,
            skipped: st.result.skipped,
            errorCount: st.result.errors.length,
            status: "done" as const,
          };
        }
        if (st.status === "skipped-all") {
          return {
            sheetKey: k,
            totalRows: 0, created: 0, updated: 0, skipped: 0, errorCount: 0,
            status: "missing" as const,
            error: st.error ?? "missing",
          };
        }
        return {
          sheetKey: k,
          totalRows: 0, created: 0, updated: 0, skipped: 0, errorCount: 1,
          status: "error" as const,
          error: st.error ?? "Processing failed",
        };
      });

      const fin = await finalizeUpload(jobId, file.name, summaries);
      setFinalizeResult(fin);
      if (!fin.activated) {
        setPageError(fin.message || "Import was not activated — previous active master data remains.");
      } else {
        setPageError(null);
        setActiveInfo(
          `Active master: ${file.name}${fin.contentRevision != null ? ` · rev ${fin.contentRevision}` : ""} · version ${versionId.slice(0, 8)}…`,
        );
      }

      const updated = await fetchUploadHistory().catch(() => null);
      if (updated) setHistory(updated);
    } catch (e) {
      setPageError((e as Error).message);
    } finally {
      setRunning(false);
      setDone(true);
      setCurrentStep(0);
    }
  }

  function toggleSection(key: SheetKey, section: "skipped" | "errors") {
    setSheets((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        expanded: prev[key].expanded === section ? null : section,
      },
    }));
  }

  async function handleDownload() {
    setDownloading(true);
    setPageError(null);
    try {
      await downloadMastersheetTemplate();
    } catch (e) {
      setPageError((e as Error).message);
    } finally {
      setDownloading(false);
    }
  }

  const completedSheets = SHEET_ORDER.filter(
    (k) => sheets[k].status === "done" || sheets[k].status === "skipped-all" || sheets[k].status === "error",
  ).length;
  const totalSheets = SHEET_ORDER.length;
  const pct = done ? 100 : running
    ? Math.round(((completedSheets + 0.5) / totalSheets) * 100)
    : 0;

  const hasAnyResult = SHEET_ORDER.some(
    (k) => sheets[k].status === "done" || sheets[k].status === "error" || sheets[k].status === "skipped-all",
  );

  return (
    <div className={styles.wrap}>
      <PurposeBanner moduleId="mastersheet" />

      <div className={styles.singleUploadLayout}>
        {/* ── Left: how it works ────────────────────────────────── */}
        <div className={styles.infoCol}>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <FileSpreadsheet size={15} />
              How it works
            </div>
            <ol className={styles.howToList}>
              <li>Download the master sheet template (one .xlsx with all 6 tabs).</li>
              <li>Fill in data across all tabs: SKU Master, Categories, Category Display Image, Banner Details, Home Page Content and Subcategories.</li>
              <li>Upload the filled file — each sheet is validated, parsed, stored in the database, then activated as the live master data.</li>
            </ol>

            {activeInfo && (
              <div className={styles.totalRows} style={{ marginBottom: 12, color: "var(--fg, #166534)" }}>
                {activeInfo}
              </div>
            )}

            <div className={styles.sheetList}>
              {SHEET_ORDER.map((key, i) => {
                const st = sheets[key].status;
                return (
                  <div key={key} className={styles.sheetListItem} data-status={st}>
                    {st === "processing" && <Loader size={11} className={styles.spin} />}
                    {st === "done"       && <CheckCircle size={11} />}
                    {st === "error"      && <AlertCircle size={11} />}
                    {st === "skipped-all" && <AlertCircle size={11} />}
                    {(st === "waiting")  && <span className={styles.stepNum}>{i + 1}</span>}
                    {SHEET_LABELS[key]}
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16 }}>
              <div className={styles.sectionLabel}>Step 1 — Download template</div>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={handleDownload}
                disabled={downloading}
              >
                {downloading ? <Loader size={14} className={styles.spin} /> : <Download size={14} />}
                {downloading ? "Downloading…" : "Download master sheet template (.xlsx)"}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right: upload + progress ──────────────────────────── */}
        <div className={styles.uploadCol}>
          <div className={styles.card}>
            <div className={styles.sectionLabel}>Step 2 — Upload filled master sheet</div>

            {/* Drop zone */}
            <div
              className={styles.dropZone}
              data-over={dragOver}
              data-has-file={!!file}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
              onClick={() => !running && inputRef.current?.click()}
            >
              {file ? (
                <>
                  <FileSpreadsheet size={26} className={styles.dropIcon} />
                  <div className={styles.fileName}>{file.name}</div>
                  <div className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB — click to change</div>
                </>
              ) : (
                <>
                  <Upload size={26} className={styles.dropIcon} />
                  <div className={styles.dropText}>Drop the master sheet here or click to browse</div>
                  <div className={styles.dropHint}>All 6 sheet tabs processed automatically · .xlsx / .xls · max 30 MB</div>
                </>
              )}
              <input ref={inputRef} type="file" accept=".xlsx,.xls" style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)} />
            </div>

            {/* Page-level error */}
            {pageError && (
              <div className={styles.pageError}>
                <AlertCircle size={13} />
                {pageError}
              </div>
            )}

            {finalizeResult?.activated && (
              <div className={styles.totalRows} style={{ marginTop: 8, color: "#166534" }}>
                <CheckCircle size={13} style={{ verticalAlign: "middle", marginRight: 4 }} />
                {finalizeResult.message}
              </div>
            )}

            {/* Actions */}
            <div className={styles.uploadActions}>
              <button
                type="button"
                className={styles.uploadBtn}
                disabled={!file || running}
                onClick={handleUpload}
              >
                {running
                  ? <><Loader size={14} className={styles.spin} /> Processing sheet {currentStep} of {totalSheets}…</>
                  : <><Upload size={14} /> Upload &amp; sync all sheets</>}
              </button>
              {file && !running && (
                <button type="button" className={styles.clearBtn}
                  onClick={() => { setFile(null); setDone(false); setPageError(null); setFinalizeResult(null); resetSheets(); }}>
                  Clear
                </button>
              )}
            </div>

            {/* Overall progress bar */}
            {(running || done) && (
              <div className={styles.overallProgress}>
                <div className={styles.overallProgressBar}>
                  <div
                    className={styles.overallProgressFill}
                    style={{ width: `${pct}%`, transition: pct > 0 ? 'width 0.4s ease' : 'none' }}
                  />
                </div>
                <span className={styles.overallPct}>{pct}%</span>
                {done && (
                  <span className={styles.overallDone}>
                    <CheckCircle size={12} /> Complete
                  </span>
                )}
              </div>
            )}

            {/* Per-sheet progress list */}
            {hasAnyResult || running ? (
              <div className={styles.sheetRows}>
                {done && (
                  <div className={styles.dismissRow}>
                    <button type="button" className={styles.clearBtn}
                      onClick={() => { setDone(false); setFile(null); setPageError(null); setFinalizeResult(null); resetSheets(); }}>
                      <X size={11} style={{ verticalAlign: "middle" }} /> Dismiss results
                    </button>
                  </div>
                )}
                {SHEET_ORDER.map((key) => (
                  <SheetRow
                    key={key}
                    sheetKey={key}
                    state={sheets[key]}
                    onToggle={(section) => toggleSection(key, section)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </div>

    {/* ── Upload History ────────────────────────────────────────── */}
    <div className={styles.historySection}>
      <div className={styles.historyHeader}>
        <History size={15} />
        Upload History
        <span className={styles.historyCount}>{history.length} record{history.length !== 1 ? "s" : ""}</span>
      </div>

      {historyLoading && (
        <div className={styles.historyEmpty}>
          <Loader size={14} className={styles.spin} /> Loading history…
        </div>
      )}

      {!historyLoading && history.length === 0 && (
        <div className={styles.historyEmpty}>No uploads yet — history appears here after your first upload.</div>
      )}

      {!historyLoading && history.length > 0 && (
        <div className={styles.historyList}>
          {history.map((rec) => {
            const isOpen = expandedHistoryId === rec._id;
            const date = new Date(rec.uploadedAt);
            const dateStr = date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            const timeStr = date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

            return (
              <div key={rec._id} className={styles.historyItem} data-open={isOpen}>
                <div className={styles.historyItemHeader}
                  onClick={() => setExpandedHistoryId(isOpen ? null : rec._id)}>
                  <div className={styles.historyMeta}>
                    <span className={styles.historyDate}>{dateStr}</span>
                    <span className={styles.historyTime}>{timeStr}</span>
                    <span className={styles.historyBy}>by {rec.uploadedByName || "Admin"}</span>
                    <span className={styles.historyFile}>· {rec.fileName}</span>
                    {rec.versionId && (
                      <span className={styles.historyFile}>· v {rec.versionId.slice(0, 8)}</span>
                    )}
                    {rec.status && (
                      <span
                        className={styles.chip}
                        data-t={rec.isActive || rec.status === "active" ? "created" : rec.status === "failed" ? "error" : "skipped"}
                      >
                        {rec.isActive ? "active" : rec.status}
                      </span>
                    )}
                  </div>
                  <div className={styles.historyStats}>
                    {rec.totalCreated > 0 && <span className={styles.chip} data-t="created">+{rec.totalCreated}</span>}
                    {rec.totalUpdated > 0 && <span className={styles.chip} data-t="updated">↺ {rec.totalUpdated}</span>}
                    {rec.totalSkipped > 0 && <span className={styles.chip} data-t="skipped">{rec.totalSkipped} skipped</span>}
                    {rec.totalErrors  > 0 && <span className={styles.chip} data-t="error">{rec.totalErrors} errors</span>}
                  </div>
                  <button type="button" className={styles.expandBtn}>
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>
                </div>

                {isOpen && (
                  <div className={styles.historyDetail}>
                    <div className={styles.historyDetailGrid}>
                      <span className={styles.historyDetailHdr}>Sheet</span>
                      <span className={styles.historyDetailHdr}>Rows</span>
                      <span className={styles.historyDetailHdr}>Created</span>
                      <span className={styles.historyDetailHdr}>Updated</span>
                      <span className={styles.historyDetailHdr}>Skipped</span>
                      <span className={styles.historyDetailHdr}>Errors</span>
                      {rec.sheets.map((s) => (
                        <>
                          <span key={s.sheetKey + "-l"} className={styles.historySheetName}>{s.label}</span>
                          <span key={s.sheetKey + "-t"}>{s.totalRows}</span>
                          <span key={s.sheetKey + "-c"} style={{ color: s.created   > 0 ? "#15803d" : "var(--mu)" }}>{s.created}</span>
                          <span key={s.sheetKey + "-u"} style={{ color: s.updated   > 0 ? "#1d4ed8" : "var(--mu)" }}>{s.updated}</span>
                          <span key={s.sheetKey + "-s"} style={{ color: s.skipped   > 0 ? "#92400e" : "var(--mu)" }}>{s.skipped}</span>
                          <span key={s.sheetKey + "-e"} style={{ color: s.errorCount > 0 ? "#b91c1c" : "var(--mu)" }}>{s.errorCount}</span>
                        </>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  </div>
  );
}
