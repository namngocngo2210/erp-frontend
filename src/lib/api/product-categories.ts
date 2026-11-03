// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 2 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, apiPatch, type components } from "@/api/typed";

const API_BASE = "/api/orders/product-categories";

/** Type derive từ hợp đồng OpenAPI (D9); đổi serializer ở BE → `tsc` đỏ ở FE. */
export type ProductCategoryProduct = components["schemas"]["ProductCategoryProduct"];

/**
 * Schema để `sort_order`/`is_active`/`is_loyal_default` optional (có default);
 * BE luôn trả đủ nên nắn lại required cho page khỏi null-check thừa.
 */
export type ProductCategory = Omit<
  components["schemas"]["ProductCategory"],
  "sort_order" | "is_active" | "is_loyal_default"
> & {
  sort_order: number;
  is_active: boolean;
  is_loyal_default: boolean;
};

export type ProductCategoryUpsert = Omit<
  components["schemas"]["PatchedProductCategory"],
  "id" | "products" | "product_count" | "created_at" | "updated_at"
>;

/** Envelope {items, total} — total sau filter để FE dựng phân trang số. */
export type ProductCategoryList = Omit<
  components["schemas"]["ProductCategoryListEnvelope"],
  "items"
> & { items: ProductCategory[] };

/**
 * GET có query (q/limit/offset) mà spec khai `query?: never` (BE parse tay,
 * drift OpenAPI) — `apiGet` không nhận query string nên giữ `fetchJson`;
 * response vẫn type theo schema qua `ProductCategoryList`.
 */
export async function getProductCategories(
  params: { q?: string; limit?: number; offset?: number } = {},
): Promise<ProductCategoryList> {
  const query = new URLSearchParams({
    limit: String(params.limit ?? 100),
    offset: String(params.offset ?? 0),
  });
  if (params.q?.trim()) query.set("q", params.q.trim());
  return fetchJson(`${API_BASE}?${query.toString()}`);
}

/**
 * POST — BE dùng chung 1 view + 1 `@extend_schema` cho GET/POST nên nhánh
 * `200` trong spec là envelope của GET; `apiPost` sẽ suy nhầm kiểu trả về
 * (thực tế 201 trả 1 `ProductCategory`). Giữ `fetchJson` (cùng lý do
 * `createWarrantyClaim`).
 */
export async function createProductCategory(data: ProductCategoryUpsert): Promise<ProductCategory> {
  return fetchJson(API_BASE, { method: "POST", body: JSON.stringify(data) });
}

export async function updateProductCategory(
  id: number,
  data: ProductCategoryUpsert,
): Promise<ProductCategory> {
  return apiPatch(
    `${API_BASE}/${id}` as "/api/orders/product-categories/{category_id}",
    data,
  ) as Promise<ProductCategory>;
}

export async function deleteProductCategory(id: number): Promise<void> {
  await apiDelete(`${API_BASE}/${id}` as "/api/orders/product-categories/{category_id}");
}
