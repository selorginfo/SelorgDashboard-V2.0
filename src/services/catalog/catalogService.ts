import type { CatalogProduct, AdminProductInput } from "@/types/catalog";

export interface BulkUploadResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; sku: string; error: string }[];
}

export interface ProductsPage {
  products: CatalogProduct[];
  total: number;
  totalPages: number;
  page: number;
}

export interface FullProduct {
  _id: string;
  sku: string;
  name: string;
  priority?: number;
  skuClassification?: string;
  skuSubClassification?: string;
  skuSource?: string;
  similarProducts?: string;
  primaryVendor?: string;
  brandCode?: string;
  brand?: string;
  mfgSkuCode?: string;
  size?: string;
  uom?: string;
  colour?: string;
  material?: string;
  weightKg?: number;
  heightCm?: number;
  lengthCm?: number;
  widthCm?: number;
  cube?: number;
  primaryUpcEan?: string;
  countryOfOrigin?: string;
  hierarchyCode?: string;
  mrp?: number;
  price?: number;
  baseCost?: number;
  hsnCode?: string;
  taxPercent?: number;
  sgstPercent?: number;
  cgstPercent?: number;
  igstPercent?: number;
  cessPercent?: number;
  about?: string;
  nutrition?: string;
  originOfPlace?: string;
  healthBenefits?: string;
  shippingReturns?: string;
  skuRotation?: string;
  rotateBy?: string;
  receivingValidationCode?: string;
  pickingInstructions?: string;
  shippingInstructions?: string;
  thresholdAlertRequired?: string;
  thresholdQty?: number;
  shippingCharges?: number;
  handlingCharges?: number;
  isArsApplicable?: string;
  followStyle?: string;
  arsCalculationMethod?: string;
  fixedStock?: number;
  modelStock?: number;
  imageUrl?: string;
  images?: string[];
  searchKeywords?: string;
  orderLimitType?: string;
  minQtyPerOrder?: number;
  maxQtyPerOrder?: number;
  maxWeightPerOrder?: string;
  cartLimitPerOrder?: string;
  maxOrderValue?: string;
  maxCartQty?: number;
  maxCartWeight?: string;
  allowMixedPack?: string;
  restrictionType?: string;
  status?: string;
  stockQuantity?: number;
  gstRate?: number;
  categoryId?: string;
  subcategoryId?: string;
  description?: { about?: string } | string;
}

export interface CatalogService {
  listProducts(): Promise<CatalogProduct[]>;
  listProductsPaged(params: { page: number; limit: number; q?: string; warehouseId?: string }): Promise<ProductsPage>;
  getProduct(id: string): Promise<FullProduct>;
  setPublished(sku: string, published: boolean, id?: string): Promise<CatalogProduct>;
  createProduct(input: AdminProductInput): Promise<CatalogProduct>;
  updateProduct(id: string, input: Partial<AdminProductInput>): Promise<CatalogProduct>;
  deleteProduct(id: string): Promise<void>;
  bulkUpload(file: File): Promise<BulkUploadResult>;
}
