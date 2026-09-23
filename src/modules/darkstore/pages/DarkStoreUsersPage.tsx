import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import {
  darkStoreUsersService,
  type CreateDarkStoreStaffPayload,
  type DarkStoreRole,
  type DarkStoreShift,
} from "@/services/darkStoreUsers/darkStoreUsersService";
import { useStoreRecords } from "@/modules/darkstore/hooks/useStores";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./DarkStoreUsersPage.module.css";

const ROLES: { value: DarkStoreRole; label: string }[] = [
  { value: "manager", label: "Manager" },
  { value: "picker", label: "Picker" },
  { value: "delivery_boy", label: "Delivery Boy" },
];

const SHIFTS: { value: DarkStoreShift; label: string }[] = [
  { value: "morning", label: "Morning (6 AM – 2 PM)" },
  { value: "afternoon", label: "Afternoon (2 PM – 10 PM)" },
  { value: "evening", label: "Evening (4 PM – 12 AM)" },
  { value: "night", label: "Night (10 PM – 6 AM)" },
  { value: "full_day", label: "Full Day" },
];

const ROLE_TONE: Record<DarkStoreRole, "blue" | "amber" | "grey"> = {
  manager: "blue",
  picker: "amber",
  delivery_boy: "grey",
};

const EMPTY_FORM: CreateDarkStoreStaffPayload = {
  darkStoreId: "",
  name: "",
  email: "",
  phone: "",
  role: "picker",
  shift: "morning",
  isActive: true,
};

export function DarkStoreUsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateDarkStoreStaffPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterStoreId, setFilterStoreId] = useState("");

  const { data: storeRecords = [] } = useStoreRecords();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["darkstore-users", filterStoreId],
    queryFn: () => darkStoreUsersService.list(filterStoreId || undefined),
  });

  // Check if selected store already has a manager
  const { data: existingForStore } = useQuery({
    queryKey: ["darkstore-users-check", form.darkStoreId],
    queryFn: () => darkStoreUsersService.list(form.darkStoreId),
    enabled: !!form.darkStoreId && showForm,
  });
  const storeHasManager = (existingForStore?.items ?? []).some((s) => s.role === "manager");

  const createMutation = useMutation({
    mutationFn: darkStoreUsersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["darkstore-users"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message ?? "Failed to create staff."),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      darkStoreUsersService.update(id, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["darkstore-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: darkStoreUsersService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["darkstore-users"] }),
  });

  function set<K extends keyof CreateDarkStoreStaffPayload>(key: K, val: CreateDarkStoreStaffPayload[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.darkStoreId) { setFormError("Select a dark store."); return; }
    if (!form.name.trim()) { setFormError("Full name is required."); return; }
    if (!form.email.trim()) { setFormError("Email is required."); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setFormError("Enter a valid email."); return; }
    if (form.role === "manager" && storeHasManager) {
      setFormError("This dark store already has a manager. Only one manager is allowed per store."); return;
    }
    setFormError(null);
    createMutation.mutate(form);
  }

  function openForm() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowForm(true);
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Dark Store Users</h2>
          <p className={styles.subtitle}>Create and manage staff assigned to dark store locations.</p>
        </div>
        <Button size="sm" onClick={openForm}>
          <Plus size={14} /> Add User
        </Button>
      </div>

      <div className={styles.filterRow}>
        <select
          className={styles.filterSelect}
          value={filterStoreId}
          onChange={(e) => setFilterStoreId(e.target.value)}
        >
          <option value="">All dark stores</option>
          {storeRecords.map((s) => (
            <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
          ))}
        </select>
        <span className={styles.count}>{total} staff member{total !== 1 ? "s" : ""}</span>
      </div>

      <Card className={styles.tableCard}>
        {isLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : isError ? (
          <p className={styles.error}>Failed to load staff.</p>
        ) : items.length === 0 ? (
          <p className={styles.empty}>No staff members found. Click <strong>Add User</strong> to create one.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dark Store</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Shift</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td>
                    <span className={styles.storeName}>{item.darkStoreName ?? "—"}</span>
                    {item.darkStoreCode && <span className={styles.storeCode}> · {item.darkStoreCode}</span>}
                  </td>
                  <td className={styles.nameCell}>{item.name}</td>
                  <td className={styles.emailCell}>{item.email}</td>
                  <td className={styles.phoneCell}>{item.phone || "—"}</td>
                  <td>
                    <Badge label={ROLES.find((r) => r.value === item.role)?.label ?? item.role} tone={ROLE_TONE[item.role]} />
                  </td>
                  <td className={styles.shiftCell}>
                    {SHIFTS.find((s) => s.value === item.shift)?.label.split(" ")[0] ?? item.shift}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => toggleMutation.mutate({ id: item._id, isActive: !item.isActive })}
                      title={item.isActive ? "Click to deactivate" : "Click to activate"}
                    >
                      <Badge label={item.isActive ? "Active" : "Inactive"} tone={item.isActive ? "green" : "grey"} />
                    </button>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => { if (confirm(`Remove ${item.name}?`)) deleteMutation.mutate(item._id); }}
                      title="Remove"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Dialog
        open={showForm}
        onOpenChange={(open) => { if (!open) { setShowForm(false); setFormError(null); } }}
        title="Add Dark Store User"
        description="Create a new staff member and assign them to a dark store."
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.formGrid}>
            {/* Dark Store — full width */}
            <label className={`${styles.label} ${styles.fullWidth}`}>
              Dark Store *
              <select
                className={styles.input}
                value={form.darkStoreId}
                onChange={(e) => set("darkStoreId", e.target.value)}
                required
              >
                <option value="">— Select dark store —</option>
                {storeRecords.map((s) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.code})</option>
                ))}
              </select>
            </label>

            {/* Manager warning */}
            {form.darkStoreId && storeHasManager && form.role === "manager" && (
              <div className={`${styles.warnBox} ${styles.fullWidth}`}>
                This dark store already has a manager. Only one manager is allowed per store.
              </div>
            )}

            {/* Full Name */}
            <label className={styles.label}>
              Full Name *
              <input
                className={styles.input}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="e.g. Ravi Kumar"
                required
              />
            </label>

            {/* Email */}
            <label className={styles.label}>
              Email *
              <input
                className={styles.input}
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="ravi@example.com"
                required
              />
            </label>

            {/* Phone */}
            <label className={styles.label}>
              Phone
              <input
                className={styles.input}
                value={form.phone ?? ""}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+91 98765 43210"
              />
            </label>

            {/* Role */}
            <label className={styles.label}>
              Role *
              <select
                className={styles.input}
                value={form.role}
                onChange={(e) => set("role", e.target.value as DarkStoreRole)}
                required
              >
                {ROLES.map((r) => (
                  <option
                    key={r.value}
                    value={r.value}
                    disabled={r.value === "manager" && storeHasManager}
                  >
                    {r.label}{r.value === "manager" && storeHasManager ? " (already assigned)" : ""}
                  </option>
                ))}
              </select>
            </label>

            {/* Shift — full width */}
            <label className={`${styles.label} ${styles.fullWidth}`}>
              Shift *
              <select
                className={styles.input}
                value={form.shift}
                onChange={(e) => set("shift", e.target.value as DarkStoreShift)}
                required
              >
                {SHIFTS.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </label>

            {/* Active */}
            <label className={`${styles.checkLabel} ${styles.fullWidth}`}>
              <input
                type="checkbox"
                checked={form.isActive ?? true}
                onChange={(e) => set("isActive", e.target.checked)}
              />
              Active
            </label>
          </div>

          {formError && <p className={styles.error}>{formError}</p>}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button
              type="submit"
              size="sm"
              disabled={createMutation.isPending || (form.role === "manager" && storeHasManager)}
            >
              {createMutation.isPending ? "Saving…" : "Create User"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
