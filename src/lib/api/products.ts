// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 6 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

const API_BASE = "/api";

/**
 * Type derive từ hợp đồng OpenAPI (D9). Package/Product dùng cho CẢ đọc lẫn
 * ghi form nên các field decimal giữ `number | string` (BE trả string, form
 * gửi number) — rộng hơn schema một cách chủ đích, field mới/mất vẫn bị `tsc` bắt.
 *
 * `price` — giá ĐÃ resolve theo bảng giá đang chọn (scalar, luôn có mặt); dùng
 * cho form đơn. `prices` — dict giá THÔ theo từng bảng giá (`{code: "..."}`),
 * chỉ có khi gọi `getProducts({ include_prices: true })`; bảng nào chưa khai
 * giá thì vắng key. Hai field độc lập, không gộp/fallback vào nhau ở FE.
 */
export type ProductPackage = Omit<
  components["schemas"]["ProductPackage"],
  "id" | "price" | "prices" | "weight" | "length" | "width" | "height"
> & {
  id?: number;
  price: number | string;
  prices?: Record<string, string>;
  weight: number | string;
  length: number | string;
  width: number | string;
  height: number | string;
};

/**
 * Payload GHI cho `packages[]` (POST/PATCH). Khác `ProductPackage` (type ĐỌC)
 * ở 2 điểm, cả hai đều khớp serializer BE (`product_item_crm_serializers.py`):
 * - Bỏ `price`: BE khai `read_only_fields = ("id", "price")` trên package —
 *   input không đọc field này, BE tự resolve từ `prices[default_book]` sau
 *   khi ghi. Gửi lên cũng bị bỏ qua nên bỏ hẳn khỏi type ghi cho trung thực.
 * - `prices` là `Record<string, number>` (không phải `string` như bản đọc):
 *   BE khai `DictField(child=CharField())` nhưng `CharField.to_internal_value`
 *   tự coerce số nguyên/thực (`str(data)`) nên gửi number qua JSON vẫn hợp lệ;
 *   FE luôn có sẵn number từ form nên không cần tự `String()` hoá trước.
 */
export type ProductPackageInput = Omit<ProductPackage, "price" | "prices"> & {
  prices: Record<string, number>;
};

export type ProductGroupRef = components["schemas"]["ProductGroupRef"];

export type Product = Omit<
  components["schemas"]["Product"],
  "weight" | "length" | "width" | "height" | "is_active" | "group" | "packages"
> & {
  // `price` theo schema = decimal-string — ĐÃ đối soát runtime (WP6.2 T5):
  // DRF COERCE_DECIMAL_TO_STRING=True, ProductSerializer trả "2500000.00";
  // nơi hiển thị parse Number() trước khi format.
  weight: number | string;
  length: number | string;
  width: number | string;
  height: number | string;
  is_active: boolean;
  packages: ProductPackage[];
  group: ProductGroupRef | null;
};

/** Ghi đè luật chọn SKU đẩy lên Pancake POS (docs/pancake-pos-product-sync.md §3.1). */
export type PancakeSyncMode = components["schemas"]["PancakeSyncModeEnum"];

export interface ProductCreate {
  name: string;
  /** Tên ngắn bán hàng/Pancake — import KiotViet không ghi đè (docs/product-short-name.md). */
  short_name?: string;
  sku: string;
  is_active?: boolean;
  packages: ProductPackageInput[];
  group_id?: number | null;
  pancake_sync_mode?: PancakeSyncMode;
}

export interface ProductUpdate {
  name?: string;
  short_name?: string;
  sku?: string;
  is_active?: boolean;
  packages?: ProductPackageInput[];
  group_id?: number | null;
  pancake_sync_mode?: PancakeSyncMode;
}

export interface GetProductsParams {
  limit?: number;
  offset?: number;
  q?: string;
  group?: number;
  // Mã bảng giá (CODE, không phải id) để BE resolve `packages[].price` — thiếu/sai
  // mã thì BE tự dùng bảng mặc định.
  price_book?: string;
  // true → BE thêm `packages[].prices` (dict THÔ theo từng bảng giá, dùng cho màn
  // sửa sản phẩm — Task 9). Không truyền thì payload không có key `prices`.
  include_prices?: boolean;
}

/** Bộ lọc/ô chọn theo SP chỉ cần 3 field này — xem `getProductOptions`. */
export type ProductOption = Pick<Product, "id" | "sku" | "name">;

export type GetProductOptionsParams = Pick<GetProductsParams, "limit" | "offset" | "q" | "group">;

// Backend `list_create_products` cho phép tới max_limit=10000 trong 1 request.
// Giữ clamp = 10000 để các màn cần tải toàn bộ catalog (vd trang Sản phẩm gom nhóm)
// lấy hết trong 1 round-trip thay vì lặp 20+ request (mỗi request gánh auth/middleware).
const PRODUCTS_MAX_LIMIT = 10000;

/**
 * Dựng URL catalog sản phẩm. Export để nơi tự quản `fetchJson` (vd hook catalog
 * của trang Đơn hàng, inject fetchJson để test) vẫn không phải tự ghép query —
 * lint chặn literal "/api/orders/products?..." ở lớp UI.
 */
export function productsCatalogUrl(params: GetProductsParams & { slim?: boolean }): string {
  const query = new URLSearchParams();
  if (typeof params.limit === "number") {
    const safeLimit = Math.max(1, Math.min(PRODUCTS_MAX_LIMIT, Math.trunc(params.limit)));
    query.set("limit", String(safeLimit));
  }
  if (typeof params.offset === "number") {
    const safeOffset = Math.max(0, Math.trunc(params.offset));
    query.set("offset", String(safeOffset));
  }
  if (typeof params.q === "string" && params.q.trim().length > 0) {
    query.set("q", params.q.trim());
  }
  if (typeof params.group === "number" && Number.isFinite(params.group)) {
    query.set("group", String(Math.trunc(params.group)));
  }
  if (typeof params.price_book === "string" && params.price_book.trim().length > 0) {
    query.set("price_book", params.price_book.trim());
  }
  if (params.include_prices) {
    query.set("include_prices", "1");
  }
  if (params.slim) {
    query.set("slim", "1");
  }
  const suffix = query.toString();
  return suffix ? `${API_BASE}/orders/products?${suffix}` : `${API_BASE}/orders/products`;
}

export async function getProducts(params: GetProductsParams = {}): Promise<Product[]> {
  return fetchJson(productsCatalogUrl(params));
}

/**
 * Catalog ở chế độ SLIM: BE chỉ trả id/sku/name (bỏ packages + giá đã resolve).
 *
 * Mọi ô lọc/ô chọn theo sản phẩm phải dùng hàm này — payload đầy đủ nặng gấp ~10
 * lần cho cùng số dòng, trong khi dropdown chỉ hiện SKU và tìm theo tên.
 */
export async function getProductOptions(
  params: GetProductOptionsParams = {},
): Promise<ProductOption[]> {
  return fetchJson(productsCatalogUrl({ ...params, slim: true }));
}

// Một "entry" trên trang Sản phẩm: hoặc 1 nhóm (header gộp, biến thể lazy-load),
// hoặc 1 sản phẩm rời (group = null) với đầy đủ dữ liệu.
export interface ProductGroupEntry {
  kind: "group";
  id: number;
  code: string;
  name: string;
  variant_count: number;
  price_min: string | null;
  price_max: string | null;
}

export interface ProductSingleEntry {
  kind: "product";
  product: Product;
}

export type ProductGroupedEntry = ProductGroupEntry | ProductSingleEntry;

export interface ProductGroupedPage {
  entries: ProductGroupedEntry[];
  has_next: boolean;
  /** Tổng số entry sau filter — để dựng phân trang số. */
  total: number;
}

export interface GetProductsGroupedParams {
  limit: number;
  offset: number;
  q?: string;
}

// Backend products-grouped giới hạn max_limit=200 (đơn vị phân trang là entry).
const PRODUCTS_GROUPED_MAX_LIMIT = 200;

export async function getProductsGrouped(
  params: GetProductsGroupedParams,
): Promise<ProductGroupedPage> {
  const query = new URLSearchParams();
  const safeLimit = Math.max(1, Math.min(PRODUCTS_GROUPED_MAX_LIMIT, Math.trunc(params.limit)));
  query.set("limit", String(safeLimit));
  query.set("offset", String(Math.max(0, Math.trunc(params.offset))));
  if (typeof params.q === "string" && params.q.trim().length > 0) {
    query.set("q", params.q.trim());
  }
  return fetchJson(`${API_BASE}/orders/products-grouped?${query.toString()}`);
}

export async function createProduct(data: ProductCreate): Promise<Product> {
  return fetchJson(`${API_BASE}/orders/products`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updateProduct(id: number, data: ProductUpdate): Promise<Product> {
  return fetchJson(`${API_BASE}/orders/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function deleteProduct(id: number): Promise<void> {
  return fetchJson(`${API_BASE}/orders/products/${id}`, {
    method: "DELETE",
  });
}
