import type { Vendor } from "@/types/vendor";

export interface CreateVendorInput {
  name: string;
  category?: string;
  contact?: string;
  email?: string;
  phone?: string;
}

export interface VendorPerformance {
  vendorId: string;
  qc: { total: number; pass: number; fail: number; pending: number; passRate: number };
  openAlerts: number;
  certificates: { total: number; valid: number; expired: number };
}

export interface VendorService {
  list(): Promise<Vendor[]>;
  setStatus(id: string, status: Vendor["status"]): Promise<Vendor>;
  create(input: CreateVendorInput): Promise<Vendor>;
  recordQualityIssue(id: string, notes: string): Promise<unknown>;
  requestDocuments(id: string, note?: string): Promise<unknown>;
  getPerformance(id: string): Promise<VendorPerformance>;
}
