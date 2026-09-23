import { api } from "@/lib/apiClient";
import type { ExceptionCase } from "@/types/monitoring";
import type { ExceptionsService } from "./exceptionsService";

export const realExceptionsService: ExceptionsService = {
  async list(): Promise<ExceptionCase[]> {
    const res = await api.get<{ list?: ExceptionCase[] } | ExceptionCase[]>("/api/v1/admin/fraud/alerts");
    if (Array.isArray(res)) return res;
    return (res as { list?: ExceptionCase[] }).list ?? [];
  },

  async assignOwner(id: string, owner: string): Promise<ExceptionCase> {
    return api.patch<ExceptionCase>(`/api/v1/admin/fraud/alerts/${id}`, { owner });
  },
};
