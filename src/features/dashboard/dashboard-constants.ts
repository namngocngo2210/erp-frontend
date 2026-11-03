export const CHART_COLORS = {
  blue: "#3b82f6",
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f59e0b",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#64748b",
};

export const PERCENT_AXIS_DOMAIN: [number, number] = [0, 100];

export const UNREACHED_WARNING_THRESHOLD = 30;
export const RETURN_RATE_WARNING_THRESHOLD = 10; // % hoàn vượt mức này → tô đỏ cảnh báo

export const ENTITY_PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#8b5cf6",
  "#06b6d4",
  "#f59e0b",
  "#ef4444",
  "#ec4899",
  "#10b981",
  "#6366f1",
  "#64748b",
];

// Donut "Data theo nhà mạng" — màu gán CỐ ĐỊNH theo nhà mạng (màu theo entity,
// không theo thứ hạng total), chọn từ ENTITY_PALETTE với gợi ý nhận diện thương
// hiệu (Viettel đỏ, MobiFone xanh...); "unknown" xám trung tính chủ đích.
export const CARRIER_CHART_COLORS: Record<string, string> = {
  viettel: "#ef4444",
  mobifone: "#3b82f6",
  vinaphone: "#06b6d4",
  vietnamobile: "#f59e0b",
  gmobile: "#8b5cf6",
  itel: "#ec4899",
  wintel: "#10b981",
  unknown: "#64748b",
};

// Donut chart palette — repeats if reasons exceed length.
export const BOMB_REASON_PALETTE = [
  "#ef4444",
  "#f97316",
  "#f59e0b",
  "#eab308",
  "#84cc16",
  "#22c55e",
  "#10b981",
  "#06b6d4",
  "#3b82f6",
  "#6366f1",
  "#8b5cf6",
  "#d946ef",
  "#ec4899",
  "#64748b",
];
