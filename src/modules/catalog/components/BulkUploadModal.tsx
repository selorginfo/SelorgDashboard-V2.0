import { useRef, useState } from "react";
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Download, Loader } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import type { BulkUploadResult } from "@/services/catalog/catalogService";
import { getToken } from "@/lib/apiClient";
import styles from "./BulkUploadModal.module.css";

const API_BASE = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"] || "http://localhost:3333";
const TEMPLATE_URL = `${API_BASE}/api/v1/admin/products/bulk-upload/template`;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (file: File) => void;
  isLoading: boolean;
  result?: BulkUploadResult;
}

export function BulkUploadModal({ open, onOpenChange, onUpload, isLoading, result }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadTemplate() {
    if (downloading) return;
    setDownloading(true);
    try {
      const token = getToken();
      const res = await fetch(TEMPLATE_URL, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "selorg_product_upload_template.xlsx";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert("Could not download template. Make sure you are logged in and the server is running.");
    } finally {
      setDownloading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0]!;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      alert("Only .xlsx, .xls, and .csv files are supported");
      return;
    }
    setSelectedFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleSubmit() {
    if (selectedFile) onUpload(selectedFile);
  }

  function handleClose() {
    if (!isLoading) {
      setSelectedFile(null);
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => { if (!o) handleClose(); }}
      title="Bulk upload products"
      description="Upload the SKU Master sheet from the Selorg mastersheet (.xlsx). Up to 2,000 products per upload."
      footer={
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <Button size="sm" variant="secondary" onClick={handleClose} disabled={isLoading}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button size="sm" variant="primary" disabled={!selectedFile || isLoading} isLoading={isLoading} onClick={handleSubmit}>
              Upload
            </Button>
          )}
        </div>
      }
    >
      {result ? (
        <div className={styles.result}>
          <div className={styles.resultRow}>
            <CheckCircle size={16} color="var(--green-tx)" />
            <span><strong>{result.created}</strong> products created</span>
          </div>
          <div className={styles.resultRow}>
            <CheckCircle size={16} color="var(--green-tx)" />
            <span><strong>{result.updated}</strong> products updated</span>
          </div>
          {result.skipped > 0 && (
            <div className={styles.resultRow}>
              <span style={{ color: "var(--tx-muted)", fontSize: "0.85rem" }}>
                {result.skipped} header / metadata rows skipped automatically
              </span>
            </div>
          )}
          {result.errors.length > 0 && (
            <div className={styles.errors}>
              <div className={styles.errorsTitle}>
                <AlertCircle size={14} />
                {result.errors.length} row{result.errors.length > 1 ? "s" : ""} had errors
              </div>
              <div className={styles.errorsList}>
                {result.errors.slice(0, 10).map((e, i) => (
                  <div key={i} className={styles.errorRow}>
                    Row {e.row} (SKU: {e.sku || "—"}): {e.error}
                  </div>
                ))}
                {result.errors.length > 10 && (
                  <div className={styles.errorRow}>…and {result.errors.length - 10} more errors</div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Step 1 — download template */}
          <div className={styles.stepSection}>
            <div className={styles.stepLabel}>Step 1 — Download the template</div>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownloadTemplate}
              disabled={downloading}
            >
              {downloading ? <Loader size={15} className={styles.spin} /> : <Download size={15} />}
              {downloading ? "Downloading…" : "Download sample sheet (.xlsx)"}
            </button>
            <div className={styles.stepHint}>
              Fill in the <strong>SKU Master</strong> sheet. Rows 2–4 (validation hints) are kept as-is — the system skips them automatically.
            </div>
          </div>

          {/* Step 2 — upload filled sheet */}
          <div className={styles.stepSection}>
            <div className={styles.stepLabel}>Step 2 — Upload filled sheet</div>
            <div
              className={styles.dropZone}
              data-over={dragOver}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
            >
              {selectedFile ? (
                <>
                  <FileSpreadsheet size={32} />
                  <div className={styles.fileName}>{selectedFile.name}</div>
                  <div className={styles.fileSize}>({(selectedFile.size / 1024).toFixed(1)} KB) — click to change</div>
                </>
              ) : (
                <>
                  <Upload size={32} />
                  <div className={styles.dropText}>Drop file here or click to browse</div>
                  <div className={styles.dropHint}>.xlsx, .xls, .csv — max 10 MB</div>
                </>
              )}
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>

        </>
      )}
    </Dialog>
  );
}
