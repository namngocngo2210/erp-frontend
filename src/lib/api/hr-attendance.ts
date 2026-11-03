// eslint-disable-next-line no-restricted-imports -- nợ typed client (audit 2026-09-23 P1-2): còn 3 call fetchJson, migrate dần sang @/api/typed
import { fetchBlob, fetchJson } from "@/services/http";
import { apiDelete, apiGet, apiPatch } from "@/api/typed";
import type {
  AttendanceConfig,
  AttendanceEventListResponse,
  AttendanceEventParams,
  AttendanceLocation,
  CheckInPayload,
  CheckInResult,
  LocationPayload,
} from "@/features/hr/attendance-types";

const BASE = "/api/hr/attendance";

/** GET /api/hr/attendance/config — cấu hình vị trí chấm công + trạng thái hôm nay. */
export async function getAttendanceConfig(): Promise<AttendanceConfig> {
  return apiGet(`${BASE}/config`);
}

/**
 * POST /api/hr/attendance/check-in — chấm công (ảnh + toạ độ).
 *
 * Spec OpenAPI chỉ khai response 201 (không có 200) nên `apiPost` sẽ suy ra
 * `unknown` — giữ `fetchJson` với type schema-derived (`CheckInResult`) thay
 * vì ép kiểu qua wrapper.
 */
export async function checkIn(payload: CheckInPayload): Promise<CheckInResult> {
  return fetchJson(`${BASE}/check-in`, { method: "POST", body: JSON.stringify(payload) });
}

/** GET /api/hr/attendance/export — tải Excel bảng chấm công tháng (YYYY-MM). */
export async function downloadAttendanceExport(month: string): Promise<Blob> {
  return fetchBlob(`${BASE}/export?month=${encodeURIComponent(month)}`);
}

/** GET /api/hr/attendance/locations — danh sách vị trí chấm công. */
export async function getLocations(): Promise<AttendanceLocation[]> {
  const res = await apiGet(`${BASE}/locations`);
  return res.items;
}

/** POST /api/hr/attendance/locations — tạo vị trí chấm công (response chỉ khai 201, xem ghi chú ở `checkIn`). */
export async function createLocation(p: LocationPayload): Promise<AttendanceLocation> {
  return fetchJson(`${BASE}/locations`, { method: "POST", body: JSON.stringify(p) });
}

/** PATCH /api/hr/attendance/locations/:id — cập nhật vị trí chấm công. */
export async function updateLocation(
  id: number,
  p: Partial<LocationPayload>,
): Promise<AttendanceLocation> {
  return apiPatch(`${BASE}/locations/${id}` as "/api/hr/attendance/locations/{location_id}", p);
}

/** DELETE /api/hr/attendance/locations/:id — xoá vị trí chấm công. */
export async function deleteLocation(id: number): Promise<void> {
  await apiDelete(`${BASE}/locations/${id}` as "/api/hr/attendance/locations/{location_id}");
}

/**
 * GET /api/hr/attendance/events?... — nhật ký chấm công theo bộ lọc.
 *
 * Query params (limit/offset/department/employee/date_from/date_to) chưa
 * được khai trong spec OpenAPI (`parameters.query` là `never`) nên giữ
 * `fetchJson`; response vẫn type theo schema (`AttendanceEventListResponse`).
 */
export async function getAttendanceEvents(
  params: AttendanceEventParams,
): Promise<AttendanceEventListResponse> {
  const q = new URLSearchParams({ limit: String(params.limit), offset: String(params.offset) });
  if (params.department) q.set("department", String(params.department));
  if (params.employee) q.set("employee", String(params.employee));
  if (params.date_from) q.set("date_from", params.date_from);
  if (params.date_to) q.set("date_to", params.date_to);
  return fetchJson(`${BASE}/events?${q.toString()}`);
}
