// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { components } from "@/api/typed";

/**
 * Types sinh từ hợp đồng OpenAPI (`schema.d.ts`, regen bằng `npm run gen:api`).
 * Đổi field ở BE (`StockAvailabilityRowSerializer`) → `tsc` đỏ ở đây.
 */
export type StockAvailabilityRow = components["schemas"]["StockAvailabilityRow"];
export type StockAvailabilityResponse = components["schemas"]["StockAvailabilityResponse"];

/** Trần số mã mỗi request — phải khớp `_AVAILABILITY_MAX_SKUS` ở backend. */
export const STOCK_AVAILABILITY_MAX_SKUS = 50;

/**
 * GET /api/inventory/stock/availability — tồn BÁN ĐƯỢC của từng SKU tại một kho.
 *
 * Gác bằng quyền `orders:view` (không phải `stock:view`) nên mọi người mở được
 * form đơn đều gọi được; xem docblock của view ở backend.
 */
export async function getStockAvailability(
  warehouseId: number,
  skus: string[],
  options: { signal?: AbortSignal } = {},
): Promise<StockAvailabilityResponse> {
  const params = new URLSearchParams({
    warehouse_id: String(warehouseId),
    skus: skus.slice(0, STOCK_AVAILABILITY_MAX_SKUS).join(","),
  });
  return fetchJson(`/api/inventory/stock/availability?${params.toString()}`, {
    signal: options.signal,
  });
}
