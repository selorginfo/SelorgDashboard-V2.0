import { COMMERCE_CONFIGS } from "@/services/workspace/data/commerce";
import type { Customer } from "@/types/commerce";
import type { Badge } from "@/types/common";

const CONFIG = COMMERCE_CONFIGS.customers;

function slugify(phone: string): string {
  return phone.replace(/\D/g, "");
}

function parseWallet(value: string): number {
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

/** Reshapes the already-transcribed `customers` "Customers" rows into customer cards — same
 * "reuse the same transcribed data, reshaped" approach as storesSeed.ts. */
function buildCustomers(): Customer[] {
  if (!CONFIG) return [];
  const rows = CONFIG.rows.Customers ?? [];
  return rows.map((row) => {
    const [name, phone, orders, totalSpend, lastOrder, wallet, tickets, status] = row;
    return {
      id: slugify(phone as string),
      name: name as string,
      phone: phone as string,
      orders: orders as string,
      totalSpend: totalSpend as string,
      lastOrder: lastOrder as string,
      walletBalance: parseWallet(wallet as string),
      tickets: tickets as string,
      status: status as Badge,
    };
  });
}

export const SEED_CUSTOMERS: Customer[] = buildCustomers();
