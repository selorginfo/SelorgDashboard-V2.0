import { mockCategoryService } from "@/services/categories/categoryService.mock";
import { realCategoryService } from "@/services/categories/categoryService.real";
import type { CategoryService } from "@/services/categories/categoryService";

import { USE_MOCKS } from "@/lib/useMocks";

export const categoryService: CategoryService = USE_MOCKS ? mockCategoryService : realCategoryService;
