import { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { actionForm, actionNeedsNote, cellText, isDangerAction } from "@/modules/ops/screens";
import type { OpsScreenDef } from "@/modules/ops/types";
import type { WorkspaceRow } from "@/types/common";
import styles from "./Ops.module.css";

/**
 * One dialog for every record action. Fields come from the design's ACT_FORMS entry for the
 * action; actions without a form fall back to a note, which is mandatory for reason-bearing
 * actions (cancel, escalate, pause …) exactly as in the design.
 */
export function OpsActionDialog({
  action,
  targets,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  action: string | null;
  /** Record ids the action applies to — one, or several for a bulk action. */
  targets: string[];
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  isSubmitting?: boolean;
}) {
  const form = action ? actionForm(action) : undefined;
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  useEffect(() => {
    if (!action) return;
    const f = actionForm(action);
    setValues(Object.fromEntries((f?.fields ?? []).map((x) => [x.id, x.kind === "select" ? x.options[0] ?? "" : ""])));
    setError("");
  }, [action]);

  function submit() {
    if (form) {
      const missing = form.fields.find((f) => f.required && !(values[f.id] ?? "").trim());
      if (missing) return setError(`${missing.label} is required.`);
    } else if (action && actionNeedsNote(action) && !(values.note ?? "").trim()) {
      return setError("A reason is required for this action.");
    }
    onSubmit(values);
  }

  const fields = form?.fields ?? [{ id: "note", label: "Note", kind: "textarea" as const, options: [], required: action ? actionNeedsNote(action) : false }];
  const scope = targets.length > 1 ? `${targets.length} records` : targets[0] ?? "";

  return (
    <Dialog
      open={Boolean(action)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={action ?? ""}
      description={`${scope}${form?.advances ? " · completing this moves the record to its next stage" : ""}. Recorded in the activity log.`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant={action && isDangerAction(action) ? "danger" : "primary"} isLoading={isSubmitting} onClick={submit}>
            {action}
          </Button>
        </>
      }
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {fields.map((f) => (
          <label key={f.id} className={styles.field}>
            <span className={styles.fieldLabel}>
              {f.label}
              {f.required ? " *" : ""}
            </span>
            {f.kind === "select" ? (
              <select
                className={styles.control}
                value={values[f.id] ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [f.id]: e.target.value });
                  setError("");
                }}
              >
                {f.options.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            ) : f.kind === "textarea" ? (
              <textarea
                className={styles.control}
                value={values[f.id] ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [f.id]: e.target.value });
                  setError("");
                }}
              />
            ) : (
              <input
                className={styles.control}
                value={values[f.id] ?? ""}
                onChange={(e) => {
                  setValues({ ...values, [f.id]: e.target.value });
                  setError("");
                }}
              />
            )}
          </label>
        ))}
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

type FieldSpec = { kind: "text" | "select" | "number" | "textarea"; options?: string[]; hint?: string };

const STORES = ["DS-01 Indiranagar", "DS-02 Koramangala", "DS-03 HSR Layout", "DS-04 Whitefield", "DS-05 Jayanagar"];
const AREAS = ["AREA-01 Indiranagar", "AREA-02 Koramangala", "AREA-03 HSR Layout", "AREA-04 Whitefield"];

/** Field type per column, following the design's fieldSpec() heuristics. */
function fieldSpec(col: string, index: number, screen: OpsScreenDef): FieldSpec {
  const c = col.toLowerCase();
  const last = index === screen.columns.length - 1;
  if (last || /status|state|eligibility/.test(c)) {
    const seen = new Set<string>();
    Object.values(screen.rows).forEach((rows) => rows.forEach((r) => seen.add(cellText(r[screen.columns.length - 1]))));
    return { kind: "select", options: seen.size ? [...seen] : ["Open", "In progress", "Completed"] };
  }
  if (/^area$/.test(c)) return { kind: "select", options: AREAS };
  if (/dark store|store/.test(c) && !/container/.test(c)) return { kind: "select", options: STORES };
  if (/salary|value|revenue|incentive|deduction|payable|reward/.test(c)) return { kind: "text", hint: "Amount, e.g. ₹18,000" };
  if (/orders|stops|bags|trips|allocated|distributed|remaining|employees|interactions|downloads|visitors|conversions|batches/.test(c) && index > 0)
    return { kind: "number", hint: "Whole number" };
  if (/window|time|placed|raised|arrived|downloaded|registered|ready at|eta/.test(c)) return { kind: "text", hint: "e.g. 19:42 or 26 Aug" };
  return { kind: "text" };
}

export function OpsRecordForm({
  screen,
  tab,
  mode,
  row,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  screen: OpsScreenDef;
  tab: string;
  mode: "create" | "edit" | null;
  row?: WorkspaceRow;
  onClose: () => void;
  onSubmit: (row: WorkspaceRow, note: string) => void;
  isSubmitting?: boolean;
}) {
  const [values, setValues] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const specs = screen.columns.map((c, i) => fieldSpec(c, i, screen));

  useEffect(() => {
    if (!mode) return;
    setValues(
      screen.columns.map((_, i) =>
        mode === "edit" && row ? (cellText(row[i]) === "—" ? "" : cellText(row[i])) : specs[i]!.kind === "select" ? specs[i]!.options![0] ?? "" : ""
      )
    );
    setNote("");
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, row]);

  function submit() {
    if (!(values[0] ?? "").trim()) return setError(`${screen.columns[0]} is required.`);
    const bad = specs.findIndex((s, i) => s.kind === "number" && values[i] && !/^\d[\d,]*$/.test(values[i]!.trim()));
    if (bad >= 0) return setError(`${screen.columns[bad]} must be a whole number.`);
    const last = screen.columns.length - 1;
    const out: WorkspaceRow = values.map((v, i) => {
      const prev = row?.[i];
      if (i === last) {
        const tone = prev && typeof prev === "object" ? prev.tone : undefined;
        const seedTone = Object.values(screen.rows)
          .flat()
          .map((r) => r[last])
          .find((c) => typeof c === "object" && c?.label === v);
        return { label: v || "New", tone: (seedTone && typeof seedTone === "object" ? seedTone.tone : tone) ?? "blue" };
      }
      return v.trim() || "—";
    });
    onSubmit(out, note.trim());
  }

  const verb = mode === "edit" ? "Edit" : "New";
  return (
    <Dialog
      open={Boolean(mode)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={`${verb} ${screen.entity.toLowerCase()}`}
      description={mode === "edit" ? "Changes are written to this record's activity log." : `Added to "${tab}" and the main list.`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" isLoading={isSubmitting} onClick={submit}>
            {mode === "edit" ? "Save changes" : `Create ${screen.entity.toLowerCase()}`}
          </Button>
        </>
      }
    >
      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className={styles.formGrid}>
          {screen.columns.map((col, i) => {
            const spec = specs[i]!;
            const set = (v: string) => {
              const next = [...values];
              next[i] = v;
              setValues(next);
              setError("");
            };
            return (
              <label key={col} className={styles.field}>
                <span className={styles.fieldLabel}>
                  {col}
                  {i === 0 ? " *" : ""}
                </span>
                {spec.kind === "select" ? (
                  <select className={styles.control} value={values[i] ?? ""} onChange={(e) => set(e.target.value)}>
                    {/* Keep an existing value selectable even when it isn't one of the suggestions. */}
                    {(values[i] && !spec.options!.includes(values[i]!) ? [values[i]!, ...spec.options!] : spec.options!).map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    className={styles.control}
                    inputMode={spec.kind === "number" ? "numeric" : undefined}
                    value={values[i] ?? ""}
                    placeholder={spec.hint}
                    onChange={(e) => set(e.target.value)}
                    disabled={mode === "edit" && i === 0}
                  />
                )}
              </label>
            );
          })}
        </div>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Note</span>
          <textarea className={styles.control} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why this change — shown in the activity log" />
        </label>
        {error ? (
          <div className={styles.error} role="alert">
            {error}
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
