/**
 * Nhãn + thứ tự vùng miền hiển thị — GƯƠNG của `apps/orders/vietnam_regions.py`
 * (BE trả key, FE quyết định nhãn). Thêm/đổi vùng phải sửa cả hai nơi.
 */
export const REGION_ORDER = [
  "northern_mountains",
  "red_river_delta",
  "north_central",
  "south_central",
  "central_highlands",
  "southeast",
  "mekong_delta",
] as const;

export type RegionKey = (typeof REGION_ORDER)[number];

/** Tỉnh không map được vùng (tên lạ trong dữ liệu). */
export const UNKNOWN_REGION_KEY = "unknown";

export const REGION_LABELS: Record<string, string> = {
  northern_mountains: "Trung du & miền núi phía Bắc",
  red_river_delta: "Đồng bằng sông Hồng",
  north_central: "Bắc Trung Bộ",
  south_central: "Nam Trung Bộ",
  central_highlands: "Tây Nguyên",
  southeast: "Đông Nam Bộ",
  mekong_delta: "Tây Nam Bộ",
  [UNKNOWN_REGION_KEY]: "Không xác định",
};

/**
 * Màu CỐ ĐỊNH theo vùng (không theo thứ hạng) — cùng bộ màu đã validate với
 * biểu đồ theo nguồn, xem `source-colors.ts`. Thứ tự lát cũng cố định (Bắc →
 * Nam) nên cặp màu cạnh nhau đúng bằng cặp đã kiểm tra.
 */
const REGION_COLOR_ORDER = [
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
  "#ef4444",
] as const;

const UNKNOWN_REGION_COLOR = "#64748b";

export const REGION_COLORS: Record<string, string> = {
  ...Object.fromEntries(REGION_ORDER.map((region, idx) => [region, REGION_COLOR_ORDER[idx]])),
  [UNKNOWN_REGION_KEY]: UNKNOWN_REGION_COLOR,
};

export function colorForRegion(key: string): string {
  return REGION_COLORS[key] ?? UNKNOWN_REGION_COLOR;
}

export function labelForRegion(key: string): string {
  return REGION_LABELS[key] ?? key;
}
