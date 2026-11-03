// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 14 call fetchJson, migrate dần sang @/api/typed
import { fetchJson } from "@/services/http";
import type { paths } from "@/api/typed";

const BASE = "/api/contact-flow";

/**
 * Type SINH TỪ HỢP ĐỒNG OpenAPI — regen bằng `npm run gen:api` khi BE đổi shape.
 * List endpoints trả mảng trần (không bọc {items,total}) — khớp `paths[...]200...json`.
 */
export type FlowStage =
  paths["/api/contact-flow/stages"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type FlowResult =
  paths["/api/contact-flow/results"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type FlowTransition =
  paths["/api/contact-flow/transitions"]["get"]["responses"]["200"]["content"]["application/json"][number];
export type FlowImportReport =
  paths["/api/contact-flow/import"]["post"]["responses"]["200"]["content"]["application/json"];

/** Lỗi 400 của import: {errors: [{sheet, row, error}]} — BE không khai báo schema cho 400 nên khai tay ở đây. */
export type FlowImportRowError = { sheet: string; row: number; error: string };
export type FlowImportErrorBody = { errors: FlowImportRowError[] };

/** Body POST .../result — ghi kết quả tác nghiệp cho 1 khách (S2-1). */
export type ApplyOperationResultPayload =
  paths["/api/contact-flow/customers/{customer_id}/result"]["post"]["requestBody"]["content"]["application/json"];
/** Body POST .../due — sửa giờ hẹn của bước hiện tại (S2-1). */
export type EditOperationDuePayload =
  paths["/api/contact-flow/customers/{customer_id}/due"]["post"]["requestBody"]["content"]["application/json"];
/** Body POST .../stage — đặt bước tác nghiệp tay từ dropdown cột Tác nghiệp. */
export type SetOperationStagePayload =
  paths["/api/contact-flow/customers/{customer_id}/stage"]["post"]["requestBody"]["content"]["application/json"];
/** Response chung của 2 endpoint trên: state tác nghiệp mới nhất sau khi ghi. */
export type OperationRuntimeState =
  paths["/api/contact-flow/customers/{customer_id}/result"]["post"]["responses"]["200"]["content"]["application/json"];

// `fetchJson` (services/http.ts) không có generic — trả về kiểu qua annotation
// return type của từng hàm export, mirror lib/api/contacts.ts.
export const getStages = (): Promise<FlowStage[]> => fetchJson(`${BASE}/stages`);
export const createStage = (body: Partial<FlowStage>): Promise<FlowStage> =>
  fetchJson(`${BASE}/stages`, { method: "POST", body: JSON.stringify(body) });
export const updateStage = (id: number, body: Partial<FlowStage>): Promise<FlowStage> =>
  fetchJson(`${BASE}/stages/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const getResults = (): Promise<FlowResult[]> => fetchJson(`${BASE}/results`);
export const createResult = (body: Partial<FlowResult>): Promise<FlowResult> =>
  fetchJson(`${BASE}/results`, { method: "POST", body: JSON.stringify(body) });
export const updateResult = (id: number, body: Partial<FlowResult>): Promise<FlowResult> =>
  fetchJson(`${BASE}/results/${id}`, { method: "PATCH", body: JSON.stringify(body) });

export const getTransitions = (): Promise<FlowTransition[]> => fetchJson(`${BASE}/transitions`);
export const createTransition = (body: Partial<FlowTransition>): Promise<FlowTransition> =>
  fetchJson(`${BASE}/transitions`, { method: "POST", body: JSON.stringify(body) });
export const updateTransition = (
  id: number,
  body: Partial<FlowTransition>,
): Promise<FlowTransition> =>
  fetchJson(`${BASE}/transitions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
export const deleteTransition = (id: number): Promise<null> =>
  fetchJson(`${BASE}/transitions/${id}`, { method: "DELETE" });

/**
 * POST /api/contact-flow/import — multipart file .xlsx. `fetchJson` đã tự bỏ
 * qua việc set Content-Type khi body là FormData (xem services/http.ts:171-176)
 * nên không cần fallback XHR/fetch thủ công như import đơn hàng dạng text.
 */
export async function importFlowFile(file: File): Promise<FlowImportReport> {
  const form = new FormData();
  form.append("file", file);
  return fetchJson(`${BASE}/import`, { method: "POST", body: form });
}

/** POST /api/contact-flow/customers/:customerId/result — ghi kết quả tác nghiệp, chuyển bước theo transition. */
export const applyOperationResult = (
  customerId: number,
  body: ApplyOperationResultPayload,
): Promise<OperationRuntimeState> =>
  fetchJson(`${BASE}/customers/${customerId}/result`, {
    method: "POST",
    body: JSON.stringify(body),
  });

/** POST /api/contact-flow/customers/:customerId/due — sửa giờ hẹn của bước hiện tại (chỉ khi allow_edit_due). */
export const editOperationDue = (
  customerId: number,
  body: EditOperationDuePayload,
): Promise<OperationRuntimeState> =>
  fetchJson(`${BASE}/customers/${customerId}/due`, {
    method: "POST",
    body: JSON.stringify(body),
  });

/**
 * POST /api/contact-flow/customers/:customerId/stage — đặt bước tác nghiệp TRỰC TIẾP.
 * Đi tắt qua bảng transition (khác `applyOperationResult`), nên `due_at` phải gửi kèm:
 * không có rule nào để suy ra giờ hẹn.
 */
export const setOperationStage = (
  customerId: number,
  body: SetOperationStagePayload,
): Promise<OperationRuntimeState> =>
  fetchJson(`${BASE}/customers/${customerId}/stage`, {
    method: "POST",
    body: JSON.stringify(body),
  });
