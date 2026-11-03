import { apiDelete, apiGet, apiPatch, apiPost, type components } from "@/api/typed";
import type { CreateOrderPayload } from "@/features/orders/use-orders-data";
import type { OrderJourneyEventRow, OrderRow } from "@/features/orders/order-types";
import type { OrderSearchResult } from "@/features/warranty-claims/warranty-claim-types";

/**
 * Wrapper các endpoint JSON của đơn hàng — đi qua client typed `@/api/typed`
 * (audit 2026-09-23 P1-2): path phải có trong hợp đồng OpenAPI, body/response
 * suy ra từ `schema.d.ts`. Endpoint mà spec BE chưa khai response
 * (`content?: never`: GET /orders/:id, crm-catalogs, kiotviet-location-data,
 * PATCH /orders/:id) vẫn được kiểm path nhưng kết quả phải cast — ghi rõ ở từng
 * hàm; khi BE bổ sung serializer thì bỏ cast là `tsc` tự kiểm.
 *
 * Endpoint SSE, HTML (print) và blob (Excel) cố ý ở ngoài module này vì
 * `fetchJson` chỉ xử lý JSON.
 */

/**
 * Kiểu danh sách đơn SINH TỪ HỢP ĐỒNG OpenAPI (D9), không viết tay nữa.
 * Đổi `OrderSerializer`/wrapper ở BE → các type này tự đổi, `tsc` bắt lệch ngay.
 */
export type OrderListResponse = components["schemas"]["OrderListResponse"];
export type OrderListRequest = components["schemas"]["OrderListRequest"];

/** Map of KiotViet "location" → list of ward names, used for cascading address dropdowns. */
export type KiotVietLocationData = Record<string, string[]>;

/** Result of parsing a raw, free-text address into structured KiotViet fields. */
export interface ParsedAddress {
  address?: string;
  kiotviet_location?: string;
  kiotviet_ward?: string;
  /** Tên hành chính chuẩn — Best cần 3 trường này cho Source/Dest/Return. */
  ward?: string;
  district?: string;
  province?: string;
  ward_code?: string;
  district_code?: string;
  province_code?: string;
  /** Địa chỉ 2 cấp (34 tỉnh) quy đổi từ chuỗi thô — hiển thị ở chi tiết đơn. */
  address_level2?: string;
  ward_level2?: string;
  province_level2?: string;
  ward_code_level2?: string;
  province_code_level2?: string;
}

/** GET /api/orders/kiotviet-location-data — spec BE chưa khai schema (JSON cây), cast. */
export async function getKiotVietLocationData(): Promise<KiotVietLocationData> {
  return (await apiGet("/api/orders/kiotviet-location-data")) as KiotVietLocationData;
}

/** Địa chỉ 3 cấp (63 tỉnh, trước 01/07/2025) từ tiện ích tra cứu. */
export type AddressLookupLevel3 = components["schemas"]["LookupAddressLevel3"];

/** Địa chỉ 2 cấp (34 tỉnh, sau sáp nhập). `source`: "converted" = quy đổi từ 3 cấp,
 * "parsed" = chuỗi nhập đã ở cấu trúc mới, "" = không nhận ra. */
export type AddressLookupLevel2 = components["schemas"]["LookupAddressLevel2"];

export type AddressLookupResult = components["schemas"]["LookupAddressResponse"];

/** POST /api/orders/lookup-address — tiện ích tra cứu địa chỉ 2 cấp / 3 cấp. */
export async function lookupAddress(rawAddress: string): Promise<AddressLookupResult> {
  return apiPost("/api/orders/lookup-address", { raw_address: rawAddress });
}

/** POST /api/orders/parse-address-level2 — preview khi sale sửa tay ô "Địa chỉ 2 cấp".
 * `kiotviet_location`/`kiotviet_ward` rỗng khi tỉnh/phường mới không có trong danh
 * mục Kiot → FE giữ giá trị cũ. */
export type ParsedAddressLevel2 = components["schemas"]["ParseAddressLevel2Response"];

export async function parseAddressLevel2(addressLevel2: string): Promise<ParsedAddressLevel2> {
  return apiPost("/api/orders/parse-address-level2", { address_level2: addressLevel2 });
}

/** POST /api/orders/parse-address — parses a raw address string into structured fields. */
export async function parseAddress(rawAddress: string): Promise<ParsedAddress> {
  return apiPost("/api/orders/parse-address", { raw_address: rawAddress });
}

/**
 * GET /api/orders/crm-catalogs — option catalogs for CRM dropdowns.
 *
 * Spec BE khai "object tự do" nên caller tự cung cấp `CrmCatalogPayload` cục bộ.
 */
export async function getCrmCatalogs<T = unknown>(): Promise<T> {
  return (await apiGet("/api/orders/crm-catalogs")) as T;
}

/** GET /api/orders/:id — spec BE chưa khai schema response (row bản list), cast. */
export async function getOrder(id: number): Promise<OrderRow> {
  return (await apiGet(`/api/orders/${id}` as "/api/orders/{order_id}")) as OrderRow;
}

/**
 * GET /api/orders/:id/journey-events — contact/journey timeline of a single order.
 *
 * List endpoints (e.g. the Tư vấn board) deliberately omit journey events for
 * performance, so callers load the timeline on demand per order.
 */
export async function getOrderJourneyEvents(id: number): Promise<OrderJourneyEventRow[]> {
  const res = await apiGet(
    `/api/orders/${id}/journey-events` as "/api/orders/{order_id}/journey-events",
  );
  // `payload_json` trong spec là `unknown`, FE đọc như object — ép về kiểu row cũ.
  return Array.isArray(res?.results) ? (res.results as OrderJourneyEventRow[]) : [];
}

/** POST /api/orders/create — create an order. Returns the raw server response. */
export async function createOrder(payload: CreateOrderPayload): Promise<unknown> {
  // `CreateOrderPayload` là kiểu FE đã sanitize (order-payload.ts) rộng hơn
  // `OrderCreate` của spec ở vài trường tuỳ chọn — cast tạm, TODO khớp 2 kiểu.
  return apiPost("/api/orders/create", payload as unknown as CreateOrderBody);
}
type CreateOrderBody = Parameters<typeof apiPost<"/api/orders/create">>[1];

/** PATCH /api/orders/:id — partially update an order. Spec chưa khai response, trả raw. */
export async function updateOrder(id: number, patch: Partial<OrderRow>): Promise<unknown> {
  return apiPatch(
    `/api/orders/${id}` as "/api/orders/{order_id}",
    patch as Record<string, unknown>,
  );
}

/** POST /api/orders/bulk-delete — delete one or more orders. */
export async function deleteOrders(ids: number[]): Promise<unknown> {
  return apiPost("/api/orders/bulk-delete", { ids });
}

/** POST /api/orders/bulk-delete with a single id — convenience for deleting one order. */
export async function deleteOrder(id: number): Promise<unknown> {
  return deleteOrders([id]);
}

/** GET /api/orders/search?q= — search orders by phone/name/code for warranty claim lookup. */
export async function searchOrders(q: string): Promise<OrderSearchResult[]> {
  const params = new URLSearchParams({ q });
  return apiGet(`/api/orders/search?${params.toString()}` as "/api/orders/search");
}

/** ---- KShip sender addresses (địa chỉ điểm gửi khi tạo vận đơn) ---- */

export type KshipSenderAddress = components["schemas"]["KshipSenderAddress"];
export type KshipSenderAddressListResponse =
  components["schemas"]["KshipSenderAddressListResponse"];

export type KshipSenderAddressInput = {
  name: string;
  location_id: number;
  ward_id: number;
  address: string;
  mobile: string;
  sort_order?: number;
};

/** GET /api/orders/kship-sender-addresses — kèm default_id theo lô đơn đang chọn. */
export async function listKshipSenderAddresses(
  ids?: number[],
): Promise<KshipSenderAddressListResponse> {
  const query = ids && ids.length > 0 ? `?ids=${ids.join(",")}` : "";
  return apiGet(
    `/api/orders/kship-sender-addresses${query}` as "/api/orders/kship-sender-addresses",
  );
}

export async function createKshipSenderAddress(
  body: KshipSenderAddressInput,
): Promise<KshipSenderAddress> {
  // Spec khai cả 200 (list — sao chép từ GET cùng path) lẫn 201 (object thật);
  // client typed ưu tiên 200 nên phải ép về object 201 mà BE trả thật.
  return (await apiPost(
    "/api/orders/kship-sender-addresses",
    body,
  )) as unknown as KshipSenderAddress;
}

export async function updateKshipSenderAddress(
  id: number,
  patch: Partial<KshipSenderAddressInput>,
): Promise<KshipSenderAddress> {
  return apiPatch(
    `/api/orders/kship-sender-addresses/${id}` as "/api/orders/kship-sender-addresses/{entry_id}",
    patch,
  );
}

export async function deleteKshipSenderAddress(id: number): Promise<void> {
  await apiDelete(
    `/api/orders/kship-sender-addresses/${id}` as "/api/orders/kship-sender-addresses/{entry_id}",
  );
}
