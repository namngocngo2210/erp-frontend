// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 3 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, apiGet, apiPatch, apiPost } from "@/api/typed";
import type {
  WarrantyClaim,
  WarrantyClaimListParams,
  WarrantyClaimListResponse,
  WarrantyClaimPayload,
} from "@/features/warranty-claims/warranty-claim-types";

const BASE = "/api/warranty/claims";

/** GET /api/warranty/claims?... — query params chưa có trong spec OpenAPI nên giữ `fetchJson`. */
export async function listWarrantyClaims(
  params: WarrantyClaimListParams,
): Promise<WarrantyClaimListResponse> {
  const q = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });
  if (params.q) q.set("q", params.q);
  if (params.status != null) q.set("status", String(params.status));
  return fetchJson(`${BASE}?${q.toString()}`);
}

/**
 * POST /api/warranty/claims — tạo phiếu bảo hành.
 *
 * BE dùng chung 1 view function cho cả GET (list) và POST (create) với 1
 * `@extend_schema` (`claim_views.list_create_warranty_claims`), nên response
 * "200" trong spec OpenAPI thực ra thuộc về GET (`WarrantyClaimListResponse`)
 * — dùng `apiPost` ở đây sẽ suy nhầm kiểu trả về. Giữ `fetchJson` với type
 * đúng thực tế (`WarrantyClaim`, response 201 thật của POST).
 */
export async function createWarrantyClaim(payload: WarrantyClaimPayload): Promise<WarrantyClaim> {
  return fetchJson(BASE, { method: "POST", body: JSON.stringify(payload) });
}

/** PATCH /api/warranty/claims/:id — cập nhật phiếu bảo hành. */
export async function updateWarrantyClaim(
  id: number,
  payload: Partial<WarrantyClaimPayload>,
): Promise<WarrantyClaim> {
  return apiPatch(`${BASE}/${id}` as "/api/warranty/claims/{claim_id}", payload);
}

/** DELETE /api/warranty/claims/:id — xoá mềm phiếu bảo hành. */
export async function deleteWarrantyClaim(id: number): Promise<void> {
  await apiDelete(`${BASE}/${id}` as "/api/warranty/claims/{claim_id}");
}

/** GET /api/warranty/claims/:id. */
export async function getWarrantyClaim(id: number): Promise<WarrantyClaim> {
  return apiGet(`${BASE}/${id}` as "/api/warranty/claims/{claim_id}");
}

/**
 * POST /api/warranty/claims/:id/complete — đóng phiếu (set `completed_at`,
 * status → Hoàn thành). Không có request body; dùng `fetchJson` vì `apiPost`
 * suy kiểu request body qua `requestBody?: never` không khớp form generic ổn
 * định (endpoint khác trong file cũng theo lối `fetchJson` cho POST không body).
 */
export async function completeWarrantyClaim(id: number): Promise<WarrantyClaim> {
  return fetchJson(`${BASE}/${id}/complete`, { method: "POST", body: JSON.stringify({}) });
}

/** POST /api/warranty/claims/bulk-delete — xóa mềm hàng loạt, trả về số phiếu đã xóa. */
export async function bulkDeleteWarrantyClaims(ids: number[]): Promise<{ deleted: number }> {
  return apiPost("/api/warranty/claims/bulk-delete", { ids });
}
