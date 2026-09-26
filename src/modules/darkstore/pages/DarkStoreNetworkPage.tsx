import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, MapPin, Clock, Warehouse } from "lucide-react";
import { useStoreRecords, useCreateStore, useUpdateStore, useDeleteStore } from "@/modules/darkstore/hooks/useStores";
import type { DarkStoreRecord, DarkStoreInput } from "@/modules/darkstore/hooks/useStores";
import { StoreLocationPicker } from "@/modules/darkstore/components/StoreLocationPicker";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./DarkStoreNetworkPage.module.css";

interface WarehouseOption {
  _id: string;
  name: string;
  code: string;
  city: string;
}

/** Chennai default center so the map opens on a real city, not 0,0. */
const DEFAULT_LNG = 80.2571;
const DEFAULT_LAT = 13.0067;

const EMPTY_FORM: DarkStoreInput = {
  name: "",
  code: "",
  warehouseId: null,
  location: { type: "Point", coordinates: [DEFAULT_LNG, DEFAULT_LAT] },
  address: { line1: "", line2: "", city: "", state: "", pincode: "" },
  serviceRadius: 5,
  isActive: true,
  operatingHours: { open: "06:00", close: "23:00" },
  avgPickPackTime: 5,
  contactPhone: "",
};

export function DarkStoreNetworkPage() {
  const queryClient = useQueryClient();
  const { data: stores = [], isLoading, isError, refetch } = useStoreRecords();
  const createStore = useCreateStore();
  const updateStore = useUpdateStore();
  const deleteStore = useDeleteStore();

  const { data: warehouseOptions = [] } = useQuery({
    queryKey: ["warehouses-for-select"],
    queryFn: async (): Promise<WarehouseOption[]> => {
      try {
        const res = await api.get<WarehouseOption[] | { data?: WarehouseOption[] }>("/api/v1/admin/warehouses");
        const list = Array.isArray(res) ? res : ((res as { data?: WarehouseOption[] }).data ?? []);
        return Array.isArray(list) ? list.filter((w: any) => w.type !== "dark_store") : [];
      } catch {
        return [];
      }
    },
    staleTime: 120_000,
  });

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<DarkStoreRecord | null>(null);
  const [form, setForm] = useState<DarkStoreInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  function nextCode(): string {
    const nums = stores
      .map((s) => s.code.match(/^DS-(\d+)$/i))
      .filter(Boolean)
      .map((m) => parseInt(m![1], 10));
    const max = nums.length ? Math.max(...nums) : 0;
    return `DS-${String(max + 1).padStart(2, "0")}`;
  }

  function openCreate() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, code: nextCode() });
    setFormError(null);
    setShowForm(true);
  }

  function openEdit(ds: DarkStoreRecord) {
    setEditTarget(ds);
    setForm({
      name: ds.name,
      code: ds.code,
      warehouseId: ds.warehouseId ?? null,
      location: ds.location,
      address: ds.address,
      serviceRadius: ds.serviceRadius,
      isActive: ds.isActive,
      operatingHours: ds.operatingHours,
      avgPickPackTime: ds.avgPickPackTime,
      contactPhone: ds.contactPhone,
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

  function setAddr<K extends keyof DarkStoreInput["address"]>(key: K, val: string) {
    setForm((f) => ({ ...f, address: { ...f.address, [key]: val } }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { setFormError("Name is required."); return; }
    if (!form.code.trim()) { setFormError("Code is required."); return; }
    if (!form.address.city.trim()) { setFormError("City is required."); return; }
    const [lng, lat] = form.location.coordinates;
    if (!lat || !lng) { setFormError("Latitude and longitude are required."); return; }
    setFormError(null);

    if (editTarget) {
      updateStore.mutate(
        { id: editTarget._id, patch: form },
        { onSuccess: closeForm, onError: (err: Error) => setFormError(err.message) },
      );
    } else {
      createStore.mutate(form, {
        onSuccess: closeForm,
        onError: (err: Error) => setFormError(err.message),
      });
    }
  }

  const safeOptions = Array.isArray(warehouseOptions) ? warehouseOptions : [];
  const warehouseMap = Object.fromEntries(safeOptions.map((w) => [w._id, w]));
  const isPending = createStore.isPending || updateStore.isPending;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Dark Store Network</h2>
          <p className={styles.subtitle}>Manage dark store locations and their assigned warehouses.</p>
        </div>
        <Button size="sm" variant="primary" onClick={openCreate}>
          <Plus size={14} /> Add Dark Store
        </Button>
      </div>

      <div className={styles.countRow}>
        <span className={styles.count}>{stores.length} dark store{stores.length !== 1 ? "s" : ""}</span>
      </div>

      {isLoading ? (
        <p className={styles.empty}>Loading dark stores…</p>
      ) : isError ? (
        <div className={styles.emptyCard}>
          <p className={styles.error}>Failed to load dark stores.</p>
          <Button size="sm" variant="secondary" onClick={() => refetch()}>Retry</Button>
        </div>
      ) : stores.length === 0 ? (
        <Card className={styles.emptyCard}>
          <p className={styles.empty}>No dark stores yet. Click <strong>Add Dark Store</strong> to create one.</p>
        </Card>
      ) : (
        <div className={styles.grid}>
          {stores.map((ds) => {
            const wh = ds.warehouseId ? warehouseMap[ds.warehouseId] : null;
            const [lng, lat] = ds.location?.coordinates ?? [0, 0];
            return (
              <Card key={ds._id} className={styles.card}>
                <div className={styles.cardTop}>
                  <div>
                    <div className={styles.cardName}>{ds.name}</div>
                    <div className={styles.cardCode}>{ds.code}</div>
                  </div>
                  <div className={styles.cardBadges}>
                    <Badge label={ds.isActive ? "Active" : "Inactive"} tone={ds.isActive ? "green" : "grey"} />
                  </div>
                </div>

                {wh && (
                  <div className={styles.warehouseTag}>
                    <Warehouse size={12} />
                    <span>{wh.name} ({wh.code}) · {wh.city}</span>
                  </div>
                )}

                <div className={styles.cardMeta}>
                  <span className={styles.metaRow}>
                    <MapPin size={12} />
                    {ds.address.line1}{ds.address.line1 ? ", " : ""}{ds.address.city}, {ds.address.state} {ds.address.pincode}
                  </span>
                  <span className={styles.metaRow}>
                    <MapPin size={12} />
                    {lat.toFixed(5)}, {lng.toFixed(5)} · Radius {ds.serviceRadius} km
                  </span>
                  <span className={styles.metaRow}>
                    <Clock size={12} />
                    {ds.operatingHours.open} – {ds.operatingHours.close} · Avg pick {ds.avgPickPackTime} min
                  </span>
                </div>

                <div className={styles.cardFooter}>
                  <button type="button" className={styles.iconBtn} onClick={() => openEdit(ds)} title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => { if (confirm(`Delete "${ds.name}"?`)) deleteStore.mutate(ds._id); }}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={showForm}
        onOpenChange={(open) => { if (!open) closeForm(); }}
        title={editTarget ? `Edit — ${editTarget.name}` : "Add Dark Store"}
        description="All fields marked * are required."
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            <label className={styles.label}>
              Name *
              <input className={styles.input} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="DS-01 Indiranagar" required />
            </label>
            <label className={styles.label}>
              Code *
              <input className={styles.input} value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="DS-01" required />
            </label>

            {/* Warehouse selector */}
            <label className={`${styles.label} ${styles.fullWidth}`}>
              Linked Warehouse *
              <select
                className={styles.input}
                value={form.warehouseId ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value || null }))}
                required
              >
                <option value="">— Select a warehouse —</option>
                {safeOptions.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} ({w.code}) · {w.city}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.label}>
              Status
              <select className={styles.input} value={form.isActive ? "true" : "false"} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.value === "true" }))}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </label>
            <label className={styles.label}>
              Service Radius (km) *
              <input className={styles.input} type="number" min={1} max={50} value={form.serviceRadius} onChange={(e) => setForm((f) => ({ ...f, serviceRadius: Number(e.target.value) }))} required />
            </label>

            <label className={`${styles.label} ${styles.fullWidth}`}>
              Address Line 1
              <input className={styles.input} value={form.address.line1} onChange={(e) => setAddr("line1", e.target.value)} placeholder="123, 100 Feet Road" />
            </label>

            <label className={styles.label}>
              City *
              <input className={styles.input} value={form.address.city} onChange={(e) => setAddr("city", e.target.value)} placeholder="Bangalore" required />
            </label>
            <label className={styles.label}>
              State *
              <input className={styles.input} value={form.address.state} onChange={(e) => setAddr("state", e.target.value)} placeholder="Karnataka" required />
            </label>

            <label className={styles.label}>
              Pincode
              <input className={styles.input} value={form.address.pincode} onChange={(e) => setAddr("pincode", e.target.value)} placeholder="560038" />
            </label>
            <label className={styles.label}>
              Contact Phone
              <input className={styles.input} value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} placeholder="+91 98765 43210" />
            </label>

            <div className={`${styles.mapBlock} ${styles.fullWidth}`}>
              <span className={styles.label}>Location on map *</span>
              <StoreLocationPicker
                latitude={form.location.coordinates[1] || DEFAULT_LAT}
                longitude={form.location.coordinates[0] || DEFAULT_LNG}
                radiusKm={form.serviceRadius}
                height={280}
                onChange={({ latitude, longitude }) =>
                  setForm((f) => ({
                    ...f,
                    location: { type: "Point", coordinates: [longitude, latitude] },
                  }))
                }
              />
            </div>

            <label className={styles.label}>
              Latitude *
              <input
                className={styles.input}
                type="number"
                step="any"
                value={form.location.coordinates[1] || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location: {
                      ...f.location,
                      coordinates: [f.location.coordinates[0], parseFloat(e.target.value) || 0],
                    },
                  }))
                }
                placeholder="13.0067"
                required
              />
            </label>
            <label className={styles.label}>
              Longitude *
              <input
                className={styles.input}
                type="number"
                step="any"
                value={form.location.coordinates[0] || ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    location: {
                      ...f.location,
                      coordinates: [parseFloat(e.target.value) || 0, f.location.coordinates[1]],
                    },
                  }))
                }
                placeholder="80.2571"
                required
              />
            </label>

            <label className={styles.label}>
              Open Time *
              <input className={styles.input} type="time" value={form.operatingHours.open} onChange={(e) => setForm((f) => ({ ...f, operatingHours: { ...f.operatingHours, open: e.target.value } }))} required />
            </label>
            <label className={styles.label}>
              Close Time *
              <input className={styles.input} type="time" value={form.operatingHours.close} onChange={(e) => setForm((f) => ({ ...f, operatingHours: { ...f.operatingHours, close: e.target.value } }))} required />
            </label>

            <label className={styles.label}>
              Avg Pick &amp; Pack Time (min)
              <input className={styles.input} type="number" min={1} value={form.avgPickPackTime} onChange={(e) => setForm((f) => ({ ...f, avgPickPackTime: Number(e.target.value) }))} />
            </label>
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" size="sm" onClick={closeForm}>Cancel</Button>
            <Button type="submit" variant="primary" size="sm" disabled={isPending}>
              {isPending ? "Saving…" : editTarget ? "Save Changes" : "Create Dark Store"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
