import { useCallback } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  type GetProductsGroupedParams,
  type Product,
  type ProductCreate,
  type ProductOption,
  type ProductUpdate,
  createProduct,
  deleteProduct,
  getProductOptions,
  getProductsGrouped,
  updateProduct,
} from "@/lib/api/products";
import {
  type ProductCategory,
  type ProductCategoryList,
  type ProductCategoryUpsert,
  createProductCategory,
  deleteProductCategory,
  getProductCategories,
  updateProductCategory,
} from "@/lib/api/product-categories";

export type ProductCategoriesListParams = {
  q?: string;
  limit: number;
  offset: number;
};

export const productKeys = {
  all: ["products"] as const,
  grouped: (params: GetProductsGroupedParams) => ["products", "grouped", params] as const,
  categories: ["products", "categories"] as const,
  categoriesList: (params: ProductCategoriesListParams) =>
    ["products", "categories", "list", params] as const,
  optionsAll: ["products", "options-all"] as const,
  search: (q: string) => ["products", "search", q] as const,
};

/**
 * Tìm sản phẩm theo từ khoá cho các ô chọn async (SearchableSelect `onSearch`)
 * — đi qua React Query `fetchQuery` để cache/dedupe theo từ khoá thay vì gọi
 * API trần trong component (SearchableSelect tự quản search state nên không
 * dùng được dạng hook `useQuery` trực tiếp).
 *
 * Payload SLIM: mọi consumer chỉ render `sku` và lấy `id`.
 */
export function useProductSearch() {
  const qc = useQueryClient();
  return useCallback(
    (q: string) => {
      const query = q.trim();
      return qc.fetchQuery({
        queryKey: productKeys.search(query),
        queryFn: () => getProductOptions({ q: query, limit: 30 }),
        staleTime: 30_000,
      });
    },
    [qc],
  );
}

/**
 * GET /api/orders/products-grouped — trang "entry" (1 entry = 1 nhóm hoặc 1 SP rời).
 * keepPreviousData: giữ trang cũ hiển thị trong khi tải trang/từ khoá mới,
 * đúng hành vi cũ (setEntries chỉ sau khi fetch xong).
 */
export function useProductsGrouped(params: GetProductsGroupedParams) {
  return useQuery({
    queryKey: productKeys.grouped(params),
    queryFn: () => getProductsGrouped(params),
    placeholderData: keepPreviousData,
  });
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: ProductCreate) => createProduct(payload),
    onSuccess: () => {
      // Không await: đóng dialog/toast ngay, list refetch nền (hành vi cũ).
      void qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProductUpdate }): Promise<Product> =>
      updateProduct(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * Xoá 1 hoặc nhiều sản phẩm trong 1 mutation — bulk delete chỉ invalidate
 * (và refetch list) đúng 1 lần sau khi tất cả DELETE hoàn tất, thay vì N lần.
 */
export function useDeleteProducts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => Promise.all(ids.map((id) => deleteProduct(id))),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.all });
    },
  });
}

/**
 * GET /api/orders/product-categories — danh mục sản phẩm (ít thay đổi).
 * Dùng cho bộ lọc trang Khách hàng thân thiết (danh mục mặc định is_loyal_default).
 */
export function useProductCategories() {
  return useQuery({
    queryKey: productKeys.categories,
    queryFn: () => getProductCategories(),
    staleTime: 5 * 60_000,
  });
}

/**
 * GET /api/orders/product-categories — trang quản lý danh mục (phân trang/tìm).
 * Server trả envelope {items, total} — total để dựng phân trang số.
 * keepPreviousData: giữ trang cũ hiển thị trong khi tải trang/từ khoá mới.
 */
export function useProductCategoriesList(params: ProductCategoriesListParams) {
  return useQuery({
    queryKey: productKeys.categoriesList(params),
    queryFn: () => getProductCategories(params),
    placeholderData: keepPreviousData,
  });
}

/**
 * Nạp TOÀN BỘ sản phẩm cho các multi-select lọc/gán theo SP, bằng cách phân
 * trang lặp — để tìm được mọi SKU trong DB (catalog prod >2.000 SP đang bán,
 * nạp 1 trang cố định là các SKU cuối bảng chữ cái biến mất khỏi ô tìm).
 * staleTime Infinity + queryKey dùng chung: cả app chỉ nạp đúng 1 lần/phiên.
 *
 * pageLimit 1000: BE cho tới max_limit=10000/request, cỡ trang 100 cũ tốn ~22
 * round-trip cho cùng bộ dữ liệu.
 */
export function useAllProductOptions(enabled: boolean, pageLimit = 1000, maxTotal = 10000) {
  return useQuery({
    queryKey: productKeys.optionsAll,
    queryFn: async (): Promise<ProductOption[]> => {
      const all: ProductOption[] = [];
      for (let offset = 0; offset < maxTotal; offset += pageLimit) {
        const raw = await getProductOptions({ limit: pageLimit, offset });
        // Guard shape: endpoint đổi sang envelope (hoặc mock trong test) thì dừng
        // vòng lặp thay vì ném lỗi khi spread giá trị không iterable.
        const batch = Array.isArray(raw) ? raw : [];
        all.push(...batch);
        if (batch.length < pageLimit) break;
      }
      return all;
    },
    enabled,
    staleTime: Infinity,
  });
}

export function useCreateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductCategoryUpsert) => createProductCategory(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.categories });
    },
  });
}

/**
 * PATCH danh mục — server trả bản ghi đã cập nhật; vá thẳng vào mọi cache
 * danh mục đang có (hành vi cũ: setCategories map tại chỗ, không refetch).
 */
export function useUpdateProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: ProductCategoryUpsert;
    }): Promise<ProductCategory> => updateProductCategory(id, data),
    onSuccess: (updated: ProductCategory) => {
      qc.setQueriesData<ProductCategoryList>({ queryKey: productKeys.categories }, (prev) =>
        prev
          ? { ...prev, items: prev.items.map((c) => (c.id === updated.id ? updated : c)) }
          : prev,
      );
    },
  });
}

export function useDeleteProductCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => deleteProductCategory(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: productKeys.categories });
    },
  });
}
