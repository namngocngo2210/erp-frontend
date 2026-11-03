import { apiGet, type components } from "@/api/typed";

/**
 * Type derive từ hợp đồng OpenAPI (D9): đổi serializer ở BE → `tsc` đỏ ở FE.
 * "PriceBook" — KHÔNG dùng tên "PriceList" (đã bị chiếm trong import Excel với
 * nghĩa khác: danh sách giá từng dòng SKU).
 */
export type PriceBook = components["schemas"]["PriceBook"];

/** Payload tạo/sửa bảng giá — bỏ field readOnly (id/created_at/updated_at). */
export type PriceBookInput = Omit<PriceBook, "id" | "created_at" | "updated_at">;

/** GET /api/orders/price-books — sắp theo sort_order rồi id (BE). */
export async function getPriceBooks(): Promise<PriceBook[]> {
  return apiGet("/api/orders/price-books");
}
