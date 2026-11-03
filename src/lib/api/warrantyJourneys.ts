// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 1 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import { apiDelete, apiPatch } from "@/api/typed";
import type {
  WarrantyJourney,
  WarrantyJourneyPayload,
} from "@/features/warranty-claims/warranty-claim-types";

/**
 * POST /api/warranty/claims/:claim_id/journeys — thêm hành trình mới (seq kế
 * tiếp, service tự tính). Response thật là 201 nhưng operation trong hợp đồng
 * OpenAPI chỉ khai `201`, không có `200` → `apiPost` (chỉ suy kiểu từ nhánh
 * `200`) sẽ trả `unknown`. Giữ `fetchJson` với type trả về đúng thực tế.
 */
export async function addJourney(claimId: number): Promise<WarrantyJourney> {
  return fetchJson(`/api/warranty/claims/${claimId}/journeys`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** PATCH /api/warranty/journeys/:id — cập nhật 1 phần hành trình (theo section). */
export async function updateJourney(
  id: number,
  patch: WarrantyJourneyPayload,
): Promise<WarrantyJourney> {
  return apiPatch(`/api/warranty/journeys/${id}` as "/api/warranty/journeys/{journey_id}", patch);
}

/** DELETE /api/warranty/journeys/:id. */
export async function deleteJourney(id: number): Promise<void> {
  await apiDelete(`/api/warranty/journeys/${id}` as "/api/warranty/journeys/{journey_id}");
}
