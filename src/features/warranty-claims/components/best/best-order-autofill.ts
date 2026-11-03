import type { BestLeg } from "./best-order-form";

/**
 * Ngày hôm nay dạng `YYYY-MM-DD` theo múi giờ ĐỊA PHƯƠNG.
 *
 * KHÔNG dùng `toISOString().slice(0, 10)`: nó trả ngày UTC, nên 00:30 giờ VN
 * (UTC+7) sẽ ra ngày HÔM QUA. Nhận `now` để test được mà không phải giả lập
 * đồng hồ hệ thống.
 */
export function todayIso(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Field tự điền kèm theo mã vận đơn khi tạo đơn Best thành công.
 *
 * CHỈ chặng gửi lại: §7 có `return_carrier`/`return_order_date` riêng. Chặng
 * gửi đi và thu hồi dùng chung `carrier`/`order_date` ở §4 cho cả hành trình —
 * tự đè sẽ xoá lựa chọn người dùng đã đặt cho chặng khác.
 */
export function autoFilledFields(leg: BestLeg, now: Date = new Date()): Record<string, string> {
  if (leg !== "return") return {};
  return { return_carrier: "best", return_order_date: todayIso(now) };
}
