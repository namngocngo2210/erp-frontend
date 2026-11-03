import { apiGet, type components } from "@/api/typed";

/** Thống kê cơ hội resale Foxia cho trang Chia đơn (docs/foxia-resale-delivered.md). */
export type FoxiaResaleStats = components["schemas"]["FoxiaResaleStatsResponse"];
export type FoxiaResaleStaffItem = components["schemas"]["FoxiaResaleStaffItem"];

/**
 * Lý do cơ hội đang chờ. Spec khai `state` là chuỗi (tránh đụng `StateEnum` sẵn có
 * của OpenAPI) — tập giá trị chốt ở `apps/foxia/transport/resale_views.py`.
 */
export type FoxiaResaleState =
  | "ready"
  | "disabled"
  | "bad_since"
  | "outside_shift"
  | "no_resale_config";

/** GET /api/foxia/resale-stats?date= — dòng ghi trong ngày + trạng thái hiện tại. */
export async function getFoxiaResaleStats(date: string): Promise<FoxiaResaleStats> {
  const query = new URLSearchParams({ date });
  return apiGet(`/api/foxia/resale-stats?${query.toString()}` as "/api/foxia/resale-stats");
}
