import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { useDirectory } from "@/modules/workforce/hooks/useDirectory";
import { formatInr } from "@/lib/format";
import {
  BULK_ORDER_STATUSES,
  BULK_PAYMENT_METHODS,
  BULK_PAYMENT_STATUSES,
  BULK_PRODUCTS,
  BULK_SLOTS,
  BULK_STORES,
  MOCK_BULK_PICKERS,
  MOCK_BULK_RIDERS,
} from "@/services/bulkOrders/mockBulkOrderData";
import type { BulkOrder, BulkOrderStatus, BulkPaymentStatus, CreateBulkOrderInput } from "@/types/bulkOrder";
import styles from "@/components/workspace/RecordModule.module.css";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
    </label>
  );
}

function ErrorLine({ message }: { message: string }) {
  return message ? (
    <div className={styles.hint} style={{ color: "var(--red-tx)" }} role="alert">
      {message}
    </div>
  ) : null;
}

/* ------------------------------------------------------------------ */

export function UpdateBulkStatusDialog({
  order,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  order: BulkOrder | null;
  onClose: () => void;
  onSubmit: (values: { status: BulkOrderStatus; paymentStatus: BulkPaymentStatus; note: string }) => void;
  isSubmitting?: boolean;
}) {
  const [status, setStatus] = useState<BulkOrderStatus>("Pending");
  const [paymentStatus, setPaymentStatus] = useState<BulkPaymentStatus>("Pending");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (order) {
      setStatus(order.status);
      setPaymentStatus(order.paymentStatus);
      setNote("");
    }
  }, [order]);

  // Cancelling has its own confirmation, so it isn't offered here.
  const options = BULK_ORDER_STATUSES.filter((s) => s !== "Cancelled" || order?.status === "Cancelled");
  const unchanged = order ? status === order.status && paymentStatus === order.paymentStatus : true;

  return (
    <Dialog
      open={Boolean(order)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={`Update status — ${order?.id ?? ""}`}
      description="Moving forward records every stage passed on the order timeline. Orders can't move backwards."
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" isLoading={isSubmitting} disabled={unchanged} onClick={() => onSubmit({ status, paymentStatus, note: note.trim() })}>
            Save changes
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.formRow}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Delivery status</span>
            <Select value={status} onValueChange={(v) => setStatus(v as BulkOrderStatus)} options={options.map((s) => ({ value: s, label: s }))} aria-label="Delivery status" />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Payment status</span>
            <Select
              value={paymentStatus}
              onValueChange={(v) => setPaymentStatus(v as BulkPaymentStatus)}
              options={BULK_PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))}
              aria-label="Payment status"
            />
          </div>
        </div>
        <Field label="Note (optional)">
          <textarea className={styles.control} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shown on the order timeline" />
        </Field>
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Staff options come from the existing workforce directory (riders / pickers) — the same data
 * the Rider and Picker Directory pages use. Falls back to the bulk-ops roster when the directory
 * is empty or unavailable.
 */
function useStaffOptions(kind: "rider" | "picker") {
  const { data } = useDirectory(kind);
  return useMemo(() => {
    const names = (data ?? []).map((p) => p.name).filter(Boolean);
    const list = names.length ? names : kind === "rider" ? MOCK_BULK_RIDERS : MOCK_BULK_PICKERS;
    return Array.from(new Set(list)).map((n) => ({ value: n, label: n }));
  }, [data, kind]);
}

export function AssignBulkStaffDialog({
  order,
  role,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  order: BulkOrder | null;
  role: "rider" | "picker";
  onClose: () => void;
  onSubmit: (name: string) => void;
  isSubmitting?: boolean;
}) {
  const options = useStaffOptions(role);
  const [name, setName] = useState("");
  const current = role === "rider" ? order?.rider : order?.picker;

  // Default to the current assignee, else the first option — re-evaluated once the directory loads.
  useEffect(() => {
    setName((prev) => (options.some((o) => o.value === prev) ? prev : current && options.some((o) => o.value === current) ? current : options[0]?.value ?? ""));
  }, [options, current]);

  const label = role === "rider" ? "rider" : "picker";

  return (
    <Dialog
      open={Boolean(order)}
      onOpenChange={(o) => (!o ? onClose() : undefined)}
      title={`${current ? "Reassign" : "Assign"} ${label} — ${order?.id ?? ""}`}
      description={
        role === "rider"
          ? "The rider collects the consignment once the order is ready for delivery."
          : "Assigning a picker to an order in processing starts picking."
      }
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" isLoading={isSubmitting} disabled={!name || name === current} onClick={() => onSubmit(name)}>
            Assign {label}
          </Button>
        </>
      }
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>{role === "rider" ? "Rider" : "Picker"}</span>
          <Select value={name} onValueChange={setName} options={options} placeholder={`Select a ${label}`} aria-label={`Select ${label}`} />
        </div>
        {current ? <div className={styles.hint}>Currently assigned: {current}</div> : null}
      </div>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */

interface Line {
  sku: string;
  qty: string;
}

function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toLocaleDateString("en-CA");
}

export function CreateBulkOrderDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateBulkOrderInput) => void;
  isSubmitting?: boolean;
}) {
  const [business, setBusiness] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [store, setStore] = useState(BULK_STORES[0]!);
  const [deliveryDate, setDeliveryDate] = useState(tomorrowIso());
  const [slot, setSlot] = useState(BULK_SLOTS[1]!);
  const [paymentMethod, setPaymentMethod] = useState(BULK_PAYMENT_METHODS[0]!);
  const [lines, setLines] = useState<Line[]>([{ sku: BULK_PRODUCTS[0]!.sku, qty: "10" }]);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setBusiness("");
      setContactName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setStore(BULK_STORES[0]!);
      setDeliveryDate(tomorrowIso());
      setSlot(BULK_SLOTS[1]!);
      setPaymentMethod(BULK_PAYMENT_METHODS[0]!);
      setLines([{ sku: BULK_PRODUCTS[0]!.sku, qty: "10" }]);
      setError("");
    }
  }, [open]);

  const subtotal = lines.reduce((sum, l) => {
    const p = BULK_PRODUCTS.find((x) => x.sku === l.sku);
    return sum + (p ? p.unitPrice * (Number(l.qty) || 0) : 0);
  }, 0);

  function submit() {
    if (!business.trim() || !contactName.trim() || !address.trim()) {
      setError("Business, contact name and delivery address are required");
      return;
    }
    if (!/^[+\d][\d\s-]{7,}$/.test(phone.trim())) {
      setError("Enter a valid phone number");
      return;
    }
    if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (!deliveryDate || deliveryDate < new Date().toLocaleDateString("en-CA")) {
      setError("Delivery date can't be in the past");
      return;
    }
    const items = lines
      .filter((l) => Number(l.qty) > 0)
      .map((l) => {
        const p = BULK_PRODUCTS.find((x) => x.sku === l.sku)!;
        return { ...p, qty: Math.floor(Number(l.qty)) };
      });
    if (!items.length) {
      setError("Add at least one item with a quantity");
      return;
    }
    onSubmit({
      business: business.trim(),
      contactName: contactName.trim(),
      phone: phone.trim(),
      email: email.trim() || "—",
      address: address.trim(),
      store,
      deliveryDate: `${deliveryDate}T08:00:00`,
      slot,
      paymentMethod,
      items,
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create bulk order"
      description="B2B order for an institutional client. It starts as Pending until payment is confirmed."
      footer={
        <>
          <span className={styles.filterNote}>Subtotal {formatInr(subtotal)}</span>
          <Button size="sm" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" variant="primary" isLoading={isSubmitting} onClick={submit}>
            Create order
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
        <div className={styles.formRow}>
          <Field label="Customer / business">
            <input className={styles.control} value={business} onChange={(e) => setBusiness(e.target.value)} placeholder="e.g. Rebel Foods" autoFocus />
          </Field>
          <Field label="Contact name">
            <input className={styles.control} value={contactName} onChange={(e) => setContactName(e.target.value)} />
          </Field>
        </div>
        <div className={styles.formRow}>
          <Field label="Phone">
            <input className={styles.control} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98450 00000" />
          </Field>
          <Field label="Email">
            <input className={styles.control} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="procurement@client.in" />
          </Field>
        </div>
        <Field label="Delivery address">
          <textarea className={styles.control} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
        <div className={styles.formRow}>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Fulfilling store</span>
            <Select value={store} onValueChange={setStore} options={BULK_STORES.map((s) => ({ value: s, label: s }))} aria-label="Fulfilling store" />
          </div>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Payment method</span>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} options={BULK_PAYMENT_METHODS.map((s) => ({ value: s, label: s }))} aria-label="Payment method" />
          </div>
        </div>
        <div className={styles.formRow}>
          <Field label="Delivery date">
            <input type="date" className={styles.control} value={deliveryDate} min={new Date().toLocaleDateString("en-CA")} onChange={(e) => setDeliveryDate(e.target.value)} />
          </Field>
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Delivery slot</span>
            <Select value={slot} onValueChange={setSlot} options={BULK_SLOTS.map((s) => ({ value: s, label: s }))} aria-label="Delivery slot" />
          </div>
        </div>

        <div className={styles.fieldLabel} style={{ marginBottom: 0 }}>
          Items
        </div>
        {lines.map((line, i) => (
          <div key={i} className={styles.lineRow}>
            <Select
              value={line.sku}
              onValueChange={(v) => setLines(lines.map((l, j) => (j === i ? { ...l, sku: v } : l)))}
              options={BULK_PRODUCTS.map((p) => ({ value: p.sku, label: `${p.product} · ${formatInr(p.unitPrice)}` }))}
              aria-label={`Item ${i + 1} product`}
            />
            <input
              className={styles.control}
              type="number"
              min={1}
              value={line.qty}
              onChange={(e) => setLines(lines.map((l, j) => (j === i ? { ...l, qty: e.target.value } : l)))}
              aria-label={`Item ${i + 1} quantity`}
            />
            <Button type="button" size="sm" variant="ghost" aria-label="Remove item" disabled={lines.length === 1} onClick={() => setLines(lines.filter((_, j) => j !== i))}>
              <Trash2 size={13} />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          size="sm"
          style={{ alignSelf: "flex-start" }}
          onClick={() => setLines([...lines, { sku: BULK_PRODUCTS[lines.length % BULK_PRODUCTS.length]!.sku, qty: "10" }])}
        >
          + Add item
        </Button>
        <ErrorLine message={error} />
      </form>
    </Dialog>
  );
}
