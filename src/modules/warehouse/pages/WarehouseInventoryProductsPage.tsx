import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Search, PackageCheck, AlertTriangle } from "lucide-react";
import { warehouseInventoryService, type AddWarehouseInventoryPayload } from "@/services/warehouseInventory/warehouseInventoryService";
import { warehouseCreateService } from "@/services/warehouseCreate/warehouseCreateService";
import { api } from "@/lib/apiClient";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import styles from "./WarehouseInventoryProductsPage.module.css";

interface RawProduct {
  _id?: string;
  id?: string;
  name?: string;
  sku?: string;
  price?: number;
  mrp?: number;
  imageUrl?: string;
}

const EMPTY_FORM: AddWarehouseInventoryPayload = {
  warehouseId: "",
  productId: "",
  quantity: 0,
  isAvailable: true,
  lowStockThreshold: 5,
};

export function WarehouseInventoryProductsPage() {
  const queryClient = useQueryClient();
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<AddWarehouseInventoryPayload>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState(0);
  const [editThreshold, setEditThreshold] = useState(5);

  const { data: warehouseData } = useQuery({
    queryKey: ["warehouses-list"],
    queryFn: () => warehouseCreateService.list(),
    staleTime: 120_000,
  });
  const warehouses = (warehouseData?.data ?? []).filter((w) => w.type === "warehouse");

  const { data: inventoryData, isLoading, isError } = useQuery({
    queryKey: ["wh-inventory", selectedWarehouseId],
    queryFn: () => warehouseInventoryService.list(selectedWarehouseId || undefined),
    staleTime: 30_000,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["products-for-select"],
    queryFn: async (): Promise<RawProduct[]> => {
      try {
        const res = await api.get<{ list?: RawProduct[]; data?: RawProduct[] } | RawProduct[]>("/api/v1/admin/products");
        return Array.isArray(res) ? res : ((res as { list?: RawProduct[] }).list ?? (res as { data?: RawProduct[] }).data ?? []);
      } catch { return []; }
    },
    staleTime: 120_000,
  });

  const items = inventoryData?.items ?? [];
  const total = inventoryData?.total ?? 0;

  // Products already in the currently selected warehouse (for the add form exclusion list)
  const addedProductIdsForWarehouse = useMemo(() => {
    const whId = form.warehouseId;
    if (!whId) return new Set<string>();
    return new Set(items.filter((i) => String(i.warehouseId) === whId).map((i) => String(i.productId)));
  }, [items, form.warehouseId]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return allProducts.filter((p) => {
      const id = String(p._id ?? p.id ?? "");
      if (addedProductIdsForWarehouse.has(id)) return false;
      return !q || (p.name ?? "").toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q);
    });
  }, [allProducts, productSearch, addedProductIdsForWarehouse]);

  const selectedProduct = allProducts.find((p) => String(p._id ?? p.id ?? "") === form.productId);

  const available = items.filter((i) => i.isAvailable).length;
  const lowStock = items.filter((i) => i.quantity > 0 && i.quantity <= i.lowStockThreshold).length;
  const outOfStock = items.filter((i) => i.quantity === 0).length;

  const addMutation = useMutation({
    mutationFn: warehouseInventoryService.add,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wh-inventory"] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setProductSearch("");
      setFormError(null);
    },
    onError: (err: Error) => setFormError(err.message ?? "Failed to add product."),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Parameters<typeof warehouseInventoryService.update>[1] }) =>
      warehouseInventoryService.update(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wh-inventory"] });
      setEditId(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isAvailable }: { id: string; isAvailable: boolean }) =>
      warehouseInventoryService.update(id, { isAvailable }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wh-inventory"] }),
  });

  const removeMutation = useMutation({
    mutationFn: warehouseInventoryService.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wh-inventory"] }),
  });

  function openForm() {
    setForm({ ...EMPTY_FORM, warehouseId: selectedWarehouseId });
    setProductSearch("");
    setFormError(null);
    setShowForm(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.warehouseId) { setFormError("Select a warehouse first."); return; }
    if (!form.productId) { setFormError("Select a product."); return; }
    setFormError(null);
    addMutation.mutate(form);
  }

  function startEdit(id: string, qty: number, threshold: number) {
    setEditId(id);
    setEditQty(qty);
    setEditThreshold(threshold);
  }

  function saveEdit(id: string) {
    updateMutation.mutate({ id, patch: { quantity: editQty, lowStockThreshold: editThreshold } });
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Warehouse Products</h2>
          <p className={styles.subtitle}>Manage which products are stocked at each warehouse and track quantities.</p>
        </div>
        <Button size="sm" onClick={openForm}>
          <Plus size={14} /> Add Product
        </Button>
      </div>

      {/* Warehouse selector */}
      <div className={styles.warehouseBar}>
        <select
          className={styles.warehouseSelect}
          value={selectedWarehouseId}
          onChange={(e) => setSelectedWarehouseId(e.target.value)}
        >
          <option value="">All warehouses</option>
          {warehouses.map((w) => (
            <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
          ))}
        </select>
        <span className={styles.totalCount}>{total} product{total !== 1 ? "s" : ""}</span>
      </div>

      {/* KPI chips */}
      {items.length > 0 && (
        <div className={styles.kpiRow}>
          <div className={styles.kpiChip}>
            <PackageCheck size={13} />
            <span className={styles.kpiVal}>{available}</span>
            <span className={styles.kpiLabel}>Available</span>
          </div>
          <div className={`${styles.kpiChip} ${lowStock > 0 ? styles.kpiAmber : ""}`}>
            <AlertTriangle size={13} />
            <span className={styles.kpiVal}>{lowStock}</span>
            <span className={styles.kpiLabel}>Low stock</span>
          </div>
          <div className={`${styles.kpiChip} ${outOfStock > 0 ? styles.kpiRed : ""}`}>
            <span className={styles.kpiVal}>{outOfStock}</span>
            <span className={styles.kpiLabel}>Out of stock</span>
          </div>
          <div className={styles.kpiChip}>
            <span className={styles.kpiVal}>{items.length - available}</span>
            <span className={styles.kpiLabel}>Unavailable</span>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className={styles.empty}>Loading…</p>
      ) : isError ? (
        <p className={styles.error}>Failed to load warehouse inventory.</p>
      ) : items.length === 0 ? (
        <Card className={styles.emptyCard}>
          <p className={styles.empty}>
            {selectedWarehouseId
              ? "No products added to this warehouse yet. Click Add Product to get started."
              : "No warehouse inventory records found. Add products to a warehouse to see them here."}
          </p>
        </Card>
      ) : (
        <Card className={styles.tableCard}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                {!selectedWarehouseId && <th>Warehouse</th>}
                <th>Price</th>
                <th>Stock Qty</th>
                <th>Reserved</th>
                <th>Low Stock Alert</th>
                <th>Available</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const p = item.product;
                const isLow = item.quantity > 0 && item.quantity <= item.lowStockThreshold;
                const isOut = item.quantity === 0;
                const isEditing = editId === item._id;
                const whName = warehouses.find((w) => w._id === String(item.warehouseId))?.name ?? String(item.warehouseId).slice(-6);
                return (
                  <tr key={item._id}>
                    <td>
                      <div className={styles.productCell}>
                        {p?.imageUrl && (
                          <img src={p.imageUrl} alt={p.name ?? ""} className={styles.productImg} />
                        )}
                        <span className={styles.productName}>{p?.name ?? "Unknown product"}</span>
                      </div>
                    </td>
                    <td className={styles.skuCell}>{p?.sku ?? "—"}</td>
                    {!selectedWarehouseId && <td className={styles.muteCell}>{whName}</td>}
                    <td className={styles.priceCell}>
                      {p?.mrp != null ? `₹${p.mrp}` : "—"}
                      {p?.price != null && p.price !== p.mrp && (
                        <span className={styles.sellingPrice}> · ₹{p.price}</span>
                      )}
                    </td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          className={styles.qtyInput}
                          value={editQty}
                          onChange={(e) => setEditQty(Number(e.target.value))}
                        />
                      ) : (
                        <span
                          className={`${styles.qtyValue} ${isOut ? styles.qtyOut : isLow ? styles.qtyLow : ""}`}
                          onClick={() => startEdit(item._id, item.quantity, item.lowStockThreshold)}
                          title="Click to edit"
                        >
                          {item.quantity}
                          {isOut && <span className={styles.stockTag}>Out</span>}
                          {isLow && !isOut && <span className={styles.stockTagLow}>Low</span>}
                        </span>
                      )}
                    </td>
                    <td className={styles.muteCell}>{item.reservedQty}</td>
                    <td>
                      {isEditing ? (
                        <input
                          type="number"
                          min={0}
                          className={styles.qtyInput}
                          value={editThreshold}
                          onChange={(e) => setEditThreshold(Number(e.target.value))}
                        />
                      ) : (
                        <span className={styles.muteCell}>{item.lowStockThreshold}</span>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.toggleBtn}
                        onClick={() => toggleMutation.mutate({ id: item._id, isAvailable: !item.isAvailable })}
                      >
                        <Badge label={item.isAvailable ? "Yes" : "No"} tone={item.isAvailable ? "green" : "grey"} />
                      </button>
                    </td>
                    <td className={styles.actionCell}>
                      {isEditing ? (
                        <>
                          <Button size="sm" variant="primary" onClick={() => saveEdit(item._id)}>Save</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditId(null)}>Cancel</Button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={styles.deleteBtn}
                          onClick={() => { if (confirm(`Remove "${p?.name ?? "product"}" from this warehouse?`)) removeMutation.mutate(item._id); }}
                          title="Remove"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add Product Dialog */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => { if (!open) { setShowForm(false); setProductSearch(""); setFormError(null); } }}
        title="Add Product to Warehouse"
        description="Select a product from the catalog and set its initial stock quantity."
      >
        <form className={styles.form} onSubmit={handleSubmit}>
          {/* Warehouse */}
          <label className={styles.label}>
            Warehouse *
            <select
              className={styles.input}
              value={form.warehouseId}
              onChange={(e) => {
                const newWhId = e.target.value;
                const alreadyThere = !!form.productId && items.some(
                  (i) => String(i.warehouseId) === newWhId && String(i.productId) === form.productId,
                );
                if (alreadyThere) {
                  setForm((f) => ({ ...f, warehouseId: newWhId, productId: "" }));
                  setProductSearch("");
                  setFormError("That product is already stocked at this warehouse. Please choose a different product.");
                } else {
                  setForm((f) => ({ ...f, warehouseId: newWhId }));
                  setFormError(null);
                }
              }}
              required
            >
              <option value="">— Select warehouse —</option>
              {warehouses.map((w) => (
                <option key={w._id} value={w._id}>{w.name} ({w.code})</option>
              ))}
            </select>
          </label>

          {/* Product search */}
          <div className={styles.label}>
            Product *
            <div className={styles.searchWrap}>
              <Search size={13} className={styles.searchIcon} />
              <input
                className={styles.searchInput}
                placeholder="Search by name or SKU…"
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setForm((f) => ({ ...f, productId: "" })); }}
              />
            </div>
            <div className={styles.productList}>
              {(() => {
                const q = productSearch.toLowerCase();
                const allMatchingProducts = allProducts.filter((p) =>
                  !q || (p.name ?? "").toLowerCase().includes(q) || (p.sku ?? "").toLowerCase().includes(q),
                ).slice(0, 30);

                if (allMatchingProducts.length === 0) {
                  return (
                    <div className={styles.listEmpty}>
                      {productSearch ? "No products match your search." : "Catalog is empty."}
                    </div>
                  );
                }

                return allMatchingProducts.map((p) => {
                  const id = String(p._id ?? p.id ?? "");
                  const alreadyInWh = form.warehouseId
                    ? addedProductIdsForWarehouse.has(id)
                    : false;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={styles.productRow}
                      data-selected={id === form.productId}
                      data-disabled={alreadyInWh}
                      disabled={alreadyInWh}
                      onClick={() => {
                        if (alreadyInWh) return;
                        setForm((f) => ({ ...f, productId: id }));
                        setProductSearch(p.name ?? "");
                        setFormError(null);
                      }}
                    >
                      {p.imageUrl && <img src={p.imageUrl} alt="" className={styles.rowImg} />}
                      <div style={{ flex: 1 }}>
                        <div className={styles.rowName}>{p.name}</div>
                        <div className={styles.rowMeta}>{p.sku}{p.mrp != null ? ` · ₹${p.mrp}` : ""}</div>
                      </div>
                      {alreadyInWh && (
                        <span className={styles.alreadyTag}>Already added</span>
                      )}
                    </button>
                  );
                });
              })()}
            </div>
          </div>

          {/* Qty + threshold */}
          <div className={styles.formRow}>
            <label className={styles.label}>
              Initial Quantity
              <input
                className={styles.input}
                type="number"
                min={0}
                value={form.quantity ?? 0}
                onChange={(e) => setForm((f) => ({ ...f, quantity: Number(e.target.value) }))}
              />
            </label>
            <label className={styles.label}>
              Low Stock Alert (qty)
              <input
                className={styles.input}
                type="number"
                min={0}
                value={form.lowStockThreshold ?? 5}
                onChange={(e) => setForm((f) => ({ ...f, lowStockThreshold: Number(e.target.value) }))}
              />
            </label>
          </div>

          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={form.isAvailable ?? true}
              onChange={(e) => setForm((f) => ({ ...f, isAvailable: e.target.checked }))}
            />
            Available for dispatch
          </label>

          {formError && <p className={styles.error}>{formError}</p>}

          <div className={styles.formActions}>
            <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={addMutation.isPending || !form.productId}>
              {addMutation.isPending ? "Adding…" : "Add to Warehouse"}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
