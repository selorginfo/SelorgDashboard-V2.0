import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo, useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FieldLabel } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ORDER_ACTION_FORMS } from "@/types/order";
import type { OrderActionId } from "@/types/order";
import { api } from "@/lib/apiClient";

interface OrderActionDialogProps {
  action: OrderActionId | null;
  onClose: () => void;
  onSubmit: (values: Record<string, string>) => void;
  isSubmitting?: boolean;
}

type StaffOption = { value: string; label: string };

async function loadPickers(): Promise<StaffOption[]> {
  try {
    const res = await api.get<
      | { pickers?: Array<{ _id?: string; id?: string; name?: string; workforceRole?: string }> }
      | Array<{ _id?: string; id?: string; name?: string; workforceRole?: string }>
    >("/api/v1/admin/pickers?limit=100");
    const list = Array.isArray(res)
      ? res
      : Array.isArray(res?.pickers)
        ? res.pickers
        : [];
    const pickers = list.filter(
      (p) => !p.workforceRole || p.workforceRole === "picker" || p.workforceRole === "both",
    );
    const source = pickers.length ? pickers : list;
    return source
      .map((p) => {
        const id = String(p._id ?? p.id ?? "");
        const name = String(p.name || id);
        return id ? { value: `${id}|${name}`, label: name } : null;
      })
      .filter(Boolean) as StaffOption[];
  } catch {
    return [];
  }
}

async function loadRiders(): Promise<StaffOption[]> {
  try {
    const res = await api.get<
      | Array<{ id?: string; _id?: string; name?: string; workforceRole?: string }>
      | { data?: Array<{ id?: string; _id?: string; name?: string; workforceRole?: string }> }
    >("/api/v1/admin/riders?limit=100");
    const list = Array.isArray(res)
      ? res
      : Array.isArray((res as { data?: unknown[] })?.data)
        ? (res as { data: Array<{ id?: string; _id?: string; name?: string }> }).data
        : [];
    return list
      .map((r) => {
        const id = String(r.id ?? r._id ?? "");
        const name = String(r.name || id);
        return id ? { value: `${id}|${name}`, label: name } : null;
      })
      .filter(Boolean) as StaffOption[];
  } catch {
    return [];
  }
}

export function OrderActionDialog({ action, onClose, onSubmit, isSubmitting }: OrderActionDialogProps) {
  const fields = useMemo(() => (action ? ORDER_ACTION_FORMS[action] : []), [action]);
  const [pickerOptions, setPickerOptions] = useState<StaffOption[]>([]);
  const [riderOptions, setRiderOptions] = useState<StaffOption[]>([]);
  const [loadingStaff, setLoadingStaff] = useState(false);

  useEffect(() => {
    if (!action) return;
    let cancelled = false;
    (async () => {
      setLoadingStaff(true);
      if (action === "Reassign picker") {
        const opts = await loadPickers();
        if (!cancelled) setPickerOptions(opts);
      }
      if (action === "Reassign rider") {
        const opts = await loadRiders();
        if (!cancelled) setRiderOptions(opts);
      }
      if (!cancelled) setLoadingStaff(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [action]);

  const schema = useMemo(() => {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const f of fields) {
      shape[f.id] = f.required ? z.string().min(1, `${f.label} is required`) : z.string().optional();
    }
    return z.object(shape);
  }, [fields]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<Record<string, string>>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(fields.map((f) => [f.id, ""])),
  });

  useEffect(() => {
    reset(Object.fromEntries(fields.map((f) => [f.id, ""])));
  }, [action, fields, reset]);

  if (!action) return null;

  function submit(values: Record<string, string>) {
    onSubmit(values);
    reset();
  }

  function optionsFor(fieldId: string, fallback?: string[]) {
    if (fieldId === "picker" && pickerOptions.length) return pickerOptions;
    if (fieldId === "rider" && riderOptions.length) return riderOptions;
    return (fallback ?? []).map((o) => ({ value: o, label: o }));
  }

  return (
    <Dialog
      open={Boolean(action)}
      onOpenChange={(open) => !open && onClose()}
      title={action}
      description={`This is written to the order's activity log and audit trail.`}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" isLoading={isSubmitting} onClick={handleSubmit(submit)} type="button">
            Confirm
          </Button>
        </>
      }
    >
      <form className="stack" onSubmit={handleSubmit(submit)} noValidate>
        {loadingStaff && (action === "Reassign picker" || action === "Reassign rider") ? (
          <div style={{ fontSize: 12, color: "var(--mu)", marginBottom: 8 }}>Loading staff directory…</div>
        ) : null}
        {fields.map((f) => (
          <div key={f.id} style={{ marginBottom: 14 }}>
            <FieldLabel>{f.label}</FieldLabel>
            {f.kind === "select" ? (
              <Select
                value={watch(f.id) || ""}
                onValueChange={(v) => setValue(f.id, v, { shouldValidate: true })}
                options={optionsFor(f.id, f.options)}
                placeholder={
                  f.id === "picker" && !pickerOptions.length
                    ? "No pickers found — enter via reason/note"
                    : f.id === "rider" && !riderOptions.length
                      ? "No riders found"
                      : `Select ${f.label.toLowerCase()}`
                }
              />
            ) : f.kind === "textarea" ? (
              <textarea
                {...register(f.id)}
                rows={3}
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  padding: "11px 13px",
                  border: "1px solid var(--bd)",
                  borderRadius: 10,
                  background: "var(--card)",
                  color: "var(--tx)",
                  fontFamily: "inherit",
                  fontSize: 13,
                  resize: "vertical",
                }}
              />
            ) : (
              <Input {...register(f.id)} />
            )}
            {errors[f.id] ? (
              <div style={{ marginTop: 6, fontSize: 11.5, fontWeight: 600, color: "var(--red-tx)" }}>
                {errors[f.id]?.message as string}
              </div>
            ) : null}
          </div>
        ))}
      </form>
    </Dialog>
  );
}
