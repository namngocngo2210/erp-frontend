import type { PancakeDeliveryPart, PancakeStuckGroup } from "@/lib/api/pancakePos";

/**
 * Logic thuần của trạng thái vận chuyển Pancake: mục chi tiết đơn, thẻ "Đơn treo",
 * thẻ "Lệch KiotViet ↔ Pancake" (two-way-sync §5, MR D). `Order.status` vẫn do
 * KiotViet quyết định — các thẻ này chỉ báo cáo.
 */

/** Tuổi đơn treo: < 48 giờ hiện giờ ("30 giờ"), từ 48 giờ hiện ngày + giờ ("3 ngày 4 giờ"). */
export function formatAge(hours: number, labels: { hour: string; day: string }): string {
  const h = Math.max(0, Math.floor(Number.isFinite(hours) ? hours : 0));
  if (h < 48) return `${h} ${labels.hour}`;
  const days = Math.floor(h / 24);
  const rest = h % 24;
  return rest > 0
    ? `${days} ${labels.day} ${rest} ${labels.hour}`
    : `${days} ${labels.day}`;
}

/** Mức cảnh báo theo tuổi so với ngưỡng: ≥ 2× ngưỡng là "danger", còn lại "warning". */
export function ageTone(ageHours: number, thresholdHours: number): "danger" | "warning" {
  return thresholdHours > 0 && ageHours >= thresholdHours * 2 ? "danger" : "warning";
}

export const DELIVERY_MILESTONES = [
  "inserted_at",
  "shipped_at",
  "delivered_at",
  "returned_at",
  "last_partner_status_at",
] as const;
export type DeliveryMilestone = (typeof DELIVERY_MILESTONES)[number];

/** Mốc thời gian có giá trị của một kiện, theo thứ tự tạo → gửi → giao → hoàn → ĐVVC. */
export function partMilestones(
  part: PancakeDeliveryPart,
): Array<{ key: DeliveryMilestone; at: string }> {
  return DELIVERY_MILESTONES.flatMap((key) => {
    const at = part[key];
    return at ? [{ key, at }] : [];
  });
}

/** Tổng theo kho, nhiều đơn nhất trước; tên kho trống gom về `fallback`. */
export function warehouseTotals(
  group: Pick<PancakeStuckGroup, "by_warehouse"> | undefined,
  fallback: string,
): Array<{ name: string; count: number }> {
  const merged = new Map<string, number>();
  for (const row of group?.by_warehouse ?? []) {
    const name = row.warehouse_name?.trim() || fallback;
    merged.set(name, (merged.get(name) ?? 0) + row.count);
  }
  return [...merged.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "vi"));
}
