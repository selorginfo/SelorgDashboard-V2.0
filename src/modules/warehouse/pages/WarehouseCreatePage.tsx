import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Clock, Package } from "lucide-react";
import {
  warehouseCreateService,
  type Warehouse,
  type WarehouseInput,
} from "@/services/warehouseCreate/warehouseCreateService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./WarehouseCreatePage.module.css";

const EMPTY_FORM: WarehouseInput = {
  name: "",
  code: "",
  type: "warehouse", // fixed — this page only manages warehouses
  address: "",
  city: "",
  state: "",
  pincode: "",
  latitude: 0,
  longitude: 0,
  service_radius_km: 5,
  status: true,
  open_time: "09:00",
  close_time: "21:00",
  max_orders_per_day: 500,
  max_orders_per_hour: 50,
};

export function WarehouseCreatePage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);
  const [form, setForm] = useState<WarehouseInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: async () => {
      const res = await warehouseCreateService.list();
      return { ...res, data: res.data.filter((w) => w.type === "warehouse") };
    },
  });

  const createMutation = useMutation({
    mutationFn: warehouseCreateService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses-list"] });
      closeForm();
    },
    onError: (err: Error) => setFormError(err.message ?? "Failed to create warehouse."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<WarehouseInput> }) =>
      warehouseCreateService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses-list"] });
      closeForm();
    },
    onError: (err: Error) => setFormError(err.message ?? "Failed to update warehouse."),
  });

  const deleteMutation = useMutation({
    mutationFn: warehouseCreateService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouses-list"] }),
  });

  function nextCode(): string {
    const nums = warehouses
      .map((w) => w.code.match(/^WH-(\d+)$/i))
      .filter(Boolean)
      .map((m) => parseInt(m![1], 10));
    const max = nums.length ? Math.max(...nums) : 0;
    return `WH-${String(max + 1).padStart(2, "0")}`;
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, code: nextCode() });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(wh: Warehouse) {
    setEditTarget(wh);
    setForm({
      name: wh.name,
      code: wh.code,
      type: wh.type,
      address: wh.address,
      city: wh.city,
      state: wh.state,
      pincode: wh.pincode,
      latitude: wh.latitude,
      longitude: wh.longitude,
      service_radius_km: wh.service_radius_km,
      status: wh.status,
      open_time: wh.open_time,
      close_time: wh.close_time,
      max_orders_per_day: wh.max_orders_per_day,
      max_orders_per_hour: wh.max_orders_per_hour,
    });
    setFormError(null);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError(null);
  }

  function set<K extends keyof WarehouseInput>(key: K, value: WarehouseInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.code.trim()) { setFormError("Code is required."); return; }
    if (!form.city.trim()) { setFormError("City is required."); return; }
    if (!form.latitude || !form.longitude) { setFormError("Latitude and longitude are required."); return; }
    setFormError(null);
    if (editTarget) {
      updateMutation.mutate({ id: editTarget._id, payload: form });
    } else {
      createMutation.mutate(form);
    }
  }

  const warehouses = data?.data ?? [];
  const total = data?.pagination?.total ?? warehouses.length;
  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Warehouses</h2>
          <p className={styles.subtitle}>Manage warehouse locations, capacity and delivery coverage.</p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate}>
          <Plus size={14} /> Add Warehouse
        </Button>
      </div>

      <div className={styles.countRow}>
        <span className={styles.count}>{total} warehouse{total !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <p className={styles.empty}>Loading warehouses…</p>
      ) : isError ? (
        <p className={styles.error}>Failed to load warehouses.</p>
      ) : warehouses.length === 0 ? (
        <Card className={styles.emptyCard}>
          <p className={styles.empty}>No warehouses yet. Click <strong>Add Warehouse</strong> to create one.</p>
        </Card>
      ) : (
        <div className={styles.grid}>
          {warehouses.map((wh) => (
            <Card key={wh._id} className={styles.card}>
              <div className={styles.cardTop}>
                <div>
                  <div className={styles.cardName}>{wh.name}</div>
                  <div className={styles.cardCode}>{wh.code}</div>
                </div>
                <div className={styles.cardActions}>
                  <Badge label="Warehouse" tone="blue" />
                  <Badge label={wh.status ? "Active" : "Inactive"} tone={wh.status ? "green" : "grey"} />
                </div>
              </div>

              <div className={styles.cardMeta}>
                <span className={styles.metaRow}>
                  <MapPin size={12} />
                  {wh.address}, {wh.city}, {wh.state} – {wh.pincode}
                </span>
                <span className={styles.metaRow}>
                  <MapPin size={12} />
                  {wh.latitude}, {wh.longitude} · Radius {wh.service_radius_km} km
                </span>
                <span className={styles.metaRow}>
                  <Clock size={12} />
                  {wh.open_time} – {wh.close_time}
                </span>
                <span className={styles.metaRow}>
                  <Package size={12} />
                  {wh.max_orders_per_day} orders/day · {wh.max_orders_per_hour} orders/hr
                </span>
              </div>

              <div className={styles.cardFooter}>
                <button type="button" className={styles.iconBtn} onClick={() => openEdit(wh)} title="Edit">
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                  onClick={() => { if (confirm(`Delete "${wh.name}"?`)) deleteMutation.mutate(wh._id); }}
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => { if (!open) closeForm(); }}
        title={editTarget ? `Edit — ${editTarget.name}` : "Add Warehouse"}
        description="All fields marked * are required."
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            {/* Row 1 */}
            <label className={styles.label}>
              Name *
              <input className={styles.input} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Central Warehouse" required />
            </label>
            <label className={styles.label}>
              Code *
              <input className={styles.input} value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="WH-01" required />
            </label>

            {/* Row 2 */}
            <label className={styles.label}>
              Status
              <select className={styles.input} value={form.status ? "true" : "false"} onChange={(e) => set("status", e.target.value === "true")}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className={styles.label}>
              Service Radius (km) *
              <input className={styles.input} type="number" min={1} max={100} value={form.service_radius_km} onChange={(e) => set("service_radius_km", Number(e.target.value))} required />
            </label>

            {/* Row 3 — address full width */}
            <label className={`${styles.label} ${styles.fullWidth}`}>
              Address *
              <textarea className={`${styles.input} ${styles.textarea}`} value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="123, MG Road, Bangalore" rows={2} required />
            </label>

            {/* Row 4 */}
            <label className={styles.label}>
              City *
              <input className={styles.input} value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Bangalore" required />
            </label>
            <label className={styles.label}>
              State *
              <input className={styles.input} value={form.state} onChange={(e) => set("state", e.target.value)} placeholder="Karnataka" required />
            </label>

            {/* Row 5 */}
            <label className={styles.label}>
              Pincode *
              <input className={styles.input} value={form.pincode} onChange={(e) => set("pincode", e.target.value)} placeholder="560001" required />
            </label>

            {/* Row 6 — GPS */}
            <label className={styles.label}>
              Latitude *
              <input className={styles.input} type="number" step="any" value={form.latitude || ""} onChange={(e) => set("latitude", parseFloat(e.target.value) || 0)} placeholder="12.97194" required />
            </label>
            <label className={styles.label}>
              Longitude *
              <input className={styles.input} type="number" step="any" value={form.longitude || ""} onChange={(e) => set("longitude", parseFloat(e.target.value) || 0)} placeholder="77.59369" required />
            </label>

            {/* Row 7 — time */}
            <label className={styles.label}>
              Open Time *
              <input className={styles.input} type="time" value={form.open_time} onChange={(e) => set("open_time", e.target.value)} required />
            </label>
            <label className={styles.label}>
              Close Time *
              <input className={styles.input} type="time" value={form.close_time} onChange={(e) => set("close_time", e.target.value)} required />
            </label>

            {/* Row 8 — capacity */}
            <label className={styles.label}>
              Max Orders / Day *
              <input className={styles.input} type="number" min={1} value={form.max_orders_per_day} onChange={(e) => set("max_orders_per_day", Number(e.target.value))} required />
            </label>
            <label className={styles.label}>
              Max Orders / Hour *
              <input className={styles.input} type="number" min={1} value={form.max_orders_per_hour} onChange={(e) => set("max_orders_per_hour", Number(e.target.value))} required />
            </label>
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" size="sm" onClick={closeForm}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : editTarget ? "Save Changes" : "Create Warehouse"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
