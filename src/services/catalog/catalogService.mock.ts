import { createMockTable, mockDelay, MockApiError } from "@/services/mockDb";
import { SEED_CATALOG_PRODUCTS } from "@/services/catalog/catalogSeed";
import type { CatalogProduct, AdminProductInput } from "@/types/catalog";
import type { CatalogService, BulkUploadResult, FullProduct } from "@/services/catalog/catalogService";
import type { ProductsPage } from "@/services/catalog/catalogService";

const table = createMockTable<CatalogProduct>("selorg.catalog.products", SEED_CATALOG_PRODUCTS);

export const mockCatalogService: CatalogService = {
  async listProducts() {
    await mockDelay();
    return table.all();
  },

  async listProductsPaged({ page, limit, q }): Promise<ProductsPage> {
    await mockDelay();
    let all = table.all();
    if (q) {
      const lq = q.toLowerCase();
      all = all.filter((p) => p.name.toLowerCase().includes(lq) || p.sku.toLowerCase().includes(lq));
    }
    const total = all.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const products = all.slice((page - 1) * limit, page * limit);
    return { products, total, totalPages, page };
  },

  async getProduct(id: string): Promise<FullProduct> {
    await mockDelay(100);
    const p = table.all().find((r) => r._id === id || r.sku === id);
    if (!p) throw new MockApiError(`Product ${id} not found`);
    return { _id: p._id ?? p.sku, sku: p.sku, name: p.name, status: p.status.label.toLowerCase() };
  },

  async setPublished(sku, published, _id?) {
    await mockDelay(200);
    void _id;
    let updated: CatalogProduct | undefined;
    table.update((rows) =>
      rows.map((p) => {
        if (p.sku !== sku) return p;
        updated = {
          ...p,
          status: published ? { label: "Active", tone: "green" } : { label: "Draft", tone: "grey" },
        };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Product ${sku} not found`);
    return updated;
  },

  async createProduct(input: AdminProductInput): Promise<CatalogProduct> {
    await mockDelay(300);
    const newProduct: CatalogProduct = {
      _id: input.sku,
      sku: input.sku,
      name: input.name,
      category: input.categoryId ?? "—",
      unit: input.uom ?? "1 unit",
      mrp: `₹${input.mrp}`,
      selling: `₹${input.price}`,
      storesLive: "0 / 0",
      status: { label: "Draft", tone: "grey" },
    };
    table.update((rows) => [...rows, newProduct]);
    return newProduct;
  },

  async updateProduct(id: string, input: Partial<AdminProductInput>): Promise<CatalogProduct> {
    await mockDelay(250);
    let updated: CatalogProduct | undefined;
    table.update((rows) =>
      rows.map((p) => {
        if (p.sku !== id) return p;
        updated = { ...p, name: input.name ?? p.name };
        return updated;
      })
    );
    if (!updated) throw new MockApiError(`Product ${id} not found`);
    return updated;
  },

  async deleteProduct(id: string): Promise<void> {
    await mockDelay(200);
    table.update((rows) => rows.filter((p) => p.sku !== id));
  },

  async bulkUpload(_file: File): Promise<BulkUploadResult> {
    await mockDelay(800);
    return { created: 3, updated: 1, errors: [] };
  },
};
