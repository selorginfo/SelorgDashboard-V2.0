import { getToken } from "@/lib/apiClient";

const API_BASE = import.meta.env["VITE_API_BASE_URL"] || import.meta.env["VITE_API_URL"] || "http://localhost:3333";

export type SheetKey =
  | "sku-master"
  | "categories"
  | "category-display-image"
  | "banner-details"
  | "home-page-content"
  | "subcategories";

export interface SkippedRow {
  row: number;
  ref: string;
  reason: string;
}

export interface ErrorRow {
  row: number;
  ref: string;
  error: string;
}

export interface SheetResult {
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  skippedRows: SkippedRow[];
  errors: ErrorRow[];
}

export interface PrepareResult {
  jobId: string;
  versionId: string;
  sheetsFound: string[];
  sheetRowCounts: Record<string, number>;
  validation?: {
    ok: boolean;
    requiredSheets: string[];
    warnings?: { sheet: string; type: string; message: string }[];
    warningCount?: number;
  };
}

export interface FinalizeSheetSummary {
  sheetKey: SheetKey;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
  status: "done" | "error" | "missing";
  error?: string;
}

export interface FinalizeResult {
  versionId: string;
  status: "active" | "failed";
  activated: boolean;
  contentRevision: number | null;
  totals: { created: number; updated: number; skipped: number; errors: number };
  failedSheets: string[];
  message: string;
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function errorMessageFromBody(data: unknown, fallback: string): string {
  const body = data as {
    message?: string;
    details?: { issues?: { message?: string }[] };
  };
  if (body?.details?.issues?.length) {
    const issueText = body.details.issues.map((i) => i.message).filter(Boolean).join("; ");
    if (issueText) return `${body.message ?? fallback}: ${issueText}`;
  }
  return body?.message ?? fallback;
}

/** Step 1: Upload file once — validates required sheets/columns, returns jobId + versionId */
export async function prepareUpload(file: File): Promise<PrepareResult> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/api/v1/admin/mastersheet/prepare`, {
    method: "POST",
    headers: authHeaders(),
    credentials: "include",
    body: form,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessageFromBody(data, "Upload validation failed"));
  return (data as { data: PrepareResult }).data;
}

/** Step 2: Process one sheet from the already-uploaded job into the database */
export async function processSheet(jobId: string, sheet: SheetKey): Promise<SheetResult> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/mastersheet/process/${sheet}?jobId=${encodeURIComponent(jobId)}`,
    {
      method: "POST",
      headers: { ...authHeaders() },
      credentials: "include",
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(errorMessageFromBody(data, `Failed to process sheet: ${sheet}`));
  const payload = (data as { data: SheetResult }).data;
  return {
    totalRows: payload.totalRows ?? 0,
    created: payload.created ?? 0,
    updated: payload.updated ?? 0,
    skipped: payload.skipped ?? 0,
    skippedRows: payload.skippedRows ?? [],
    errors: payload.errors ?? [],
  };
}

/** Step 3: Activate version only if all required sheets succeeded; bumps contentRevision */
export async function finalizeUpload(
  jobId: string,
  fileName: string,
  sheets: FinalizeSheetSummary[],
): Promise<FinalizeResult> {
  const res = await fetch(`${API_BASE}/api/v1/admin/mastersheet/finalize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ jobId, fileName, sheets }),
  });
  const data = await res.json().catch(() => ({}));
  const payload = (data as { data?: FinalizeResult; message?: string }).data;
  if (!payload) {
    throw new Error(errorMessageFromBody(data, "Finalize failed"));
  }
  // 422 = not activated (failed import) — still return payload so UI can show reason
  if (!res.ok && res.status !== 422) {
    throw new Error(errorMessageFromBody(data, "Finalize failed"));
  }
  return {
    versionId: payload.versionId,
    status: payload.status,
    activated: payload.activated,
    contentRevision: payload.contentRevision ?? null,
    totals: payload.totals ?? { created: 0, updated: 0, skipped: 0, errors: 0 },
    failedSheets: payload.failedSheets ?? [],
    message: payload.message ?? (data as { message?: string }).message ?? "",
  };
}

export async function fetchActiveVersion(): Promise<{
  versionId: string;
  fileName: string;
  activatedAt?: string;
  contentRevisionAfter?: number | null;
} | null> {
  const res = await fetch(`${API_BASE}/api/v1/admin/mastersheet/active`, {
    headers: { ...authHeaders() },
    credentials: "include",
    cache: "no-store",
  });
  const data = await res.json().catch(() => ({ data: null }));
  return (data as { data: {
    versionId: string;
    fileName: string;
    activatedAt?: string;
    contentRevisionAfter?: number | null;
  } | null }).data ?? null;
}

/* ── History ─────────────────────────────────────────────────────────── */

export interface HistorySheetSummary {
  sheetKey: SheetKey;
  label: string;
  totalRows: number;
  created: number;
  updated: number;
  skipped: number;
  errorCount: number;
}

export interface UploadHistoryRecord {
  _id: string;
  versionId?: string;
  uploadedAt: string;
  uploadedByName: string;
  uploadedByEmail: string;
  fileName: string;
  status?: "importing" | "active" | "failed" | "superseded";
  isActive?: boolean;
  sheetsProcessed: number;
  totalCreated: number;
  totalUpdated: number;
  totalSkipped: number;
  totalErrors: number;
  totalRecords?: number;
  failureReason?: string;
  sheets: HistorySheetSummary[];
}

/** @deprecated Prefer finalizeUpload — kept for backward compatibility */
export async function saveUploadHistory(
  fileName: string,
  sheets: { sheetKey: SheetKey; totalRows: number; created: number; updated: number; skipped: number; errorCount: number }[],
): Promise<void> {
  await fetch(`${API_BASE}/api/v1/admin/mastersheet/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    credentials: "include",
    body: JSON.stringify({ fileName, sheets }),
  });
}

export async function fetchUploadHistory(limit = 20): Promise<UploadHistoryRecord[]> {
  const res = await fetch(
    `${API_BASE}/api/v1/admin/mastersheet/history?limit=${limit}`,
    { headers: { ...authHeaders() }, credentials: "include", cache: "no-store" },
  );
  const data = await res.json().catch(() => ({ data: [] }));
  return (data as { data: UploadHistoryRecord[] }).data ?? [];
}

export async function downloadMastersheetTemplate(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/admin/mastersheet/template`, {
    headers: { ...authHeaders() },
    credentials: "include",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "selorg_mastersheet_template.xlsx";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
