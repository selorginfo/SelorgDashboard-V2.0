import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { warehouseUsersService, type CreateWarehouseUserPayload, type WarehouseUserMapping } from "@/services/warehouseUsers/warehouseUsersService";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./WarehouseUsersPage.module.css";

const ROLES: WarehouseUserMapping["role"][] = ["manager", "picker", "delivery_boy"];
const ROLE_LABELS: Record<WarehouseUserMapping["role"], string> = {
  manager: "Manager",
  picker: "Picker",
  delivery_boy: "Delivery Boy",
};

const EMPTY_FORM: CreateWarehouseUserPayload = {
  warehouseId: "",
  userId: "",
  role: "picker",
  status: true,
};

export function WarehouseUsersPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateWarehouseUserPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [filterWarehouse, setFilterWarehouse] = useState("");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["warehouse-users", filterWarehouse],
    queryFn: () => warehouseUsersService.list(filterWarehouse || undefined),
  });

  const createMutation = useMutation({
    mutationFn: warehouseUsersService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouse-users"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setFormError(null);
    },
    onError: (err: Error) => {
      setFormError(err.message ?? "Failed to create mapping.");
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: boolean }) =>
      warehouseUsersService.update(id, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouse-users"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: warehouseUsersService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["warehouse-users"] }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.warehouseId.trim()) { setFormError("Warehouse ID is required."); return; }
    if (!form.userId.trim()) { setFormError("User ID is required."); return; }
    setFormError(null);
    createMutation.mutate(form);
  }

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Warehouse Users</h2>
          <p className={styles.subtitle}>Map staff to warehouses with their assigned roles.</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setFormError(null); setForm(EMPTY_FORM); }}>
          <Plus size={14} />
          Add User
        </Button>
      </div>

      <div className={styles.filterRow}>
        <input
          className={styles.filterInput}
          placeholder="Filter by warehouse ID…"
          value={filterWarehouse}
          onChange={(e) => setFilterWarehouse(e.target.value)}
        />
        <span className={styles.count}>{total} mapping{total !== 1 ? "s" : ""}</span>
      </div>

      <Card className={styles.tableCard}>
        {isLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : isError ? (
          <p className={styles.error}>Failed to load warehouse users.</p>
        ) : items.length === 0 ? (
          <p className={styles.empty}>No warehouse user mappings found. Add one to get started.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Warehouse ID</th>
                <th>User ID</th>
                <th>Role</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item._id}>
                  <td className={styles.idCell}>{item.warehouseId}</td>
                  <td className={styles.idCell}>{item.userId}</td>
                  <td>
                    <Badge
                      label={ROLE_LABELS[item.role]}
                      tone={item.role === "manager" ? "blue" : item.role === "picker" ? "amber" : "grey"}
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.toggleBtn}
                      onClick={() => toggleStatusMutation.mutate({ id: item._id, status: !item.status })}
                      title={item.status ? "Click to deactivate" : "Click to activate"}
                    >
                      <Badge label={item.status ? "Active" : "Inactive"} tone={item.status ? "green" : "grey"} />
                    </button>
                  </td>
                  <td className={styles.dateCell}>
                    {new Date(item.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={styles.deleteBtn}
                      onClick={() => { if (confirm("Remove this user mapping?")) deleteMutation.mutate(item._id); }}
                      title="Remove mapping"
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
        title="Add Warehouse User"
      >
          <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label}>
              Warehouse ID
              <input
                className={styles.input}
                placeholder="e.g. 6780abc123…"
                value={form.warehouseId}
                onChange={(e) => setForm((f) => ({ ...f, warehouseId: e.target.value }))}
                required
              />
            </label>
            <label className={styles.label}>
              User ID
              <input
                className={styles.input}
                placeholder="e.g. 6780def456…"
                value={form.userId}
                onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))}
                required
              />
            </label>
            <label className={styles.label}>
              Role
              <select
                className={styles.input}
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as WarehouseUserMapping["role"] }))}
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </label>
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={form.status ?? true}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.checked }))}
              />
              Active
            </label>
            {formError && <p className={styles.error}>{formError}</p>}
            <div className={styles.formActions}>
              <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Saving…" : "Add Mapping"}
              </Button>
            </div>
          </form>
      </Dialog>
    </div>
  );
}
