import type { Badge } from "@/types/common";
import type { Customer } from "@/types/commerce";

export interface NewCustomerInput {
  name: string;
  email?: string;
  phoneNumber?: string;
}

export interface CustomerOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt?: string;
}

export interface CustomerRefundSummary {
  id: string;
  orderNumber: string;
  amount: number;
  status: string;
  method: string;
  createdAt?: string;
}

export interface CustomerWalletInfo {
  balance: number;
  currency: string;
}

export interface CustomerActivityItem {
  title: string;
  meta: string;
  at: number;
}

export interface CustomerService {
  list(): Promise<Customer[]>;
  creditWallet(id: string, amount: number): Promise<Customer>;
  setStatus(id: string, status: Badge): Promise<Customer>;
  create(input: NewCustomerInput): Promise<Customer>;
  getOrders(id: string): Promise<CustomerOrderSummary[]>;
  getRefunds(id: string): Promise<CustomerRefundSummary[]>;
  getWallet(id: string): Promise<CustomerWalletInfo>;
  getActivity(id: string): Promise<CustomerActivityItem[]>;
}
