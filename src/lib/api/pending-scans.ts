// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 3 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, type components } from "@/api/typed";

/**
 * Types sinh từ hợp đồng OpenAPI (`schema.d.ts`, regen bằng `npm run gen:api`).
 * Đổi field ở BE (`PendingShipmentScanSerializer`/wrapper) → các type này tự
 * đổi theo, `tsc` bắt lệch ngay.
 */
export type PendingScanRow = components["schemas"]["PendingShipmentScan"];
export type PendingScanListResponse = components["schemas"]["PendingShipmentScanListResponse"];
export type CreatePendingScansPayload = components["schemas"]["CreatePendingScansBatch"];
export type PendingScanBatchResult = components["schemas"]["PendingScanBatchResult"];
export type PendingScanBatchResponse = components["schemas"]["PendingScanBatchResponse"];

const BASE = "/api/inventory/pending-scans";

/**
 * GET /api/inventory/pending-scans — danh sách mã chờ khớp.
 *
 * Không truyền `status` → BE mặc định lọc pending+failed (dùng cho màn kho);
 * `limit`/`offset` không được khai trong query params của spec OpenAPI (BE
 * parse thủ công qua `parse_required_pagination`) nên giữ `fetchJson`, response
 * vẫn type theo schema (`PendingScanListResponse`).
 */
export async function listPendingScans(
  filters: Record<string, string> = {},
): Promise<PendingScanListResponse> {
  const params = new URLSearchParams({ limit: "50", offset: "0", ...filters });
  return fetchJson(`${BASE}?${params.toString()}`);
}

/**
 * POST /api/inventory/pending-scans/batch — tạo hàng loạt mã chờ khớp từ 1 lượt quét.
 *
 * Response chỉ khai 201 (không có 200) nên `apiPost` sẽ suy ra `unknown` —
 * giữ `fetchJson` với type schema-derived thay vì ép kiểu qua wrapper (xem
 * ghi chú tương tự ở `checkIn` trong `hr-attendance.ts`).
 */
export async function createPendingScans(
  payload: CreatePendingScansPayload,
): Promise<PendingScanBatchResponse> {
  return fetchJson(`${BASE}/batch`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * POST /api/inventory/pending-scans/:id/retry — thử lại 1 dòng lỗi (reset về pending).
 *
 * Request không có body (`requestBody?: never` trong spec) nên giữ `fetchJson`
 * thay vì `apiPost` (tránh ép kiểu body thành `never`).
 */
export async function retryPendingScan(id: number): Promise<PendingScanRow> {
  return fetchJson(`${BASE}/${id}/retry`, { method: "POST" });
}

/** DELETE /api/inventory/pending-scans/:id — xoá 1 dòng chờ khớp chưa khớp đơn. */
export async function deletePendingScan(id: number): Promise<void> {
  await apiDelete(`${BASE}/${id}` as "/api/inventory/pending-scans/{scan_id}");
}
