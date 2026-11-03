// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiGet, type components } from "@/api/typed";

/** Hợp đồng OpenAPI (regen `npm run gen:api` sau khi BE đổi serializer). */
export type WebphoneTokenResponse = components["schemas"]["WebphoneTokenResponse"];
export type OrderCallRecordsResponse = components["schemas"]["OrderCallRecordsResponse"];
export type OrderCallRecordItem = components["schemas"]["OrderCallRecordItem"];

/**
 * Lấy access token Zenify Web SDK cho agent hiện tại (RBAC `landing-orders:view`).
 * BE cache token theo email; `refresh=true` khi token bị Zenify từ chối giữa chừng.
 *
 * POST không body + query `?refresh=1` tuỳ chọn — `apiPost` chưa hỗ trợ cả
 * hai nên giữ `fetchJson`; response vẫn type theo schema.
 */
export async function fetchWebphoneToken(refresh = false): Promise<WebphoneTokenResponse> {
  const suffix = refresh ? "?refresh=1" : "";
  return fetchJson(`/api/callcenter/token${suffix}`, {
    method: "POST",
  }) as Promise<WebphoneTokenResponse>;
}

/**
 * Danh sách cuộc gọi Zenify đã khớp với đơn (ghi âm + transcript, mới nhất trước).
 * RBAC `orders:view` + scope record-level — 404 khi đơn ngoài scope.
 */
export async function fetchOrderCallRecords(orderId: number): Promise<OrderCallRecordsResponse> {
  return apiGet(
    `/api/callcenter/orders/${orderId}/call-records` as "/api/callcenter/orders/{order_id}/call-records",
  );
}
