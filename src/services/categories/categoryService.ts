import type { Category, CategoryFormInput } from "@/types/category";

export interface CategoryService {
  list(): Promise<Category[]>;
  setStatus(id: string, status: Category["status"]): Promise<Category>;
  create(input: CategoryFormInput): Promise<Category>;
  update(id: string, input: Partial<CategoryFormInput>): Promise<Category>;
  remove(id: string): Promise<void>;
}
