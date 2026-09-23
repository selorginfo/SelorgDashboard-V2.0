import type { Transfer } from "@/types/warehouse";

export interface CreateTransferInput {
  destination: string;
  items?: number;
  origin?: string;
}

export interface TransferService {
  list(): Promise<Transfer[]>;
  advance(id: string): Promise<Transfer>;
  create(input: CreateTransferInput): Promise<Transfer>;
}
