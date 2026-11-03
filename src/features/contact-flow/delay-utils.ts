/**
 * Pure TS utilities for delay/duration formatting (no React).
 * Shared by flow-graph, TransitionsTab, and DelayInput components.
 */

export type DelayUnit = "phut" | "gio" | "ngay";

/** Quy đổi số phút lưu ở BE thành cặp {value, unit} dễ nhập ở FE. Ưu tiên đơn vị lớn nhất chia hết. */
export function minutesToParts(m: number | null): { value: number; unit: DelayUnit } {
  if (!m) return { value: 0, unit: "phut" };
  if (m % 1440 === 0) return { value: m / 1440, unit: "ngay" };
  if (m % 60 === 0) return { value: m / 60, unit: "gio" };
  return { value: m, unit: "phut" };
}

/** Quy đổi ngược {value, unit} → số phút để gửi lên BE (Transition.delay_minutes). */
export function partsToMinutes(value: number, unit: DelayUnit): number {
  return unit === "ngay" ? value * 1440 : unit === "gio" ? value * 60 : value;
}

/** "30 phút" / "1 giờ" / "10 ngày"; không có độ trễ (null/0) → "Ngay lập tức". */
export function formatDelay(minutes: number | null | undefined): string {
  if (!minutes) return "Ngay lập tức";
  const { value, unit } = minutesToParts(minutes);
  const unitLabel = unit === "ngay" ? "ngày" : unit === "gio" ? "giờ" : "phút";
  return `${value} ${unitLabel}`;
}
