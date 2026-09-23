import type { Grn } from "@/types/warehouse";

export interface GrnService {
  list(): Promise<Grn[]>;
  startReceiving(id: string): Promise<Grn>;
  verifyQuantity(id: string): Promise<Grn>;
  sendToQc(id: string): Promise<Grn>;
  accept(id: string): Promise<Grn>;
  reject(id: string): Promise<Grn>;
  raiseDebitNote(id: string): Promise<Grn>;
  generateGrn(id: string): Promise<Grn>;
}
