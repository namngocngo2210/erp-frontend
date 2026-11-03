import { formatCurrency as formatCurrencyShared } from "@/lib/format";
import { DateFilterValue, getDateRange } from "@/components/ui/date-filter";

import type { DeliveryQualityCounters, SalePerformanceRow, SummaryFilters } from "./types";

export function formatCurrency(value: string | number): string {
  return formatCurrencyShared(value, { fallback: "0", onInvalid: "fallback" });
}

export function resolveDisplayName(
  row: { staff__display_name: string | null; staff__username: string | null },
  fallback: string,
): string {
  return row.staff__display_name?.trim() || row.staff__username || fallback;
}

/**
 * Mẫu số "Data tiếp cận" của Nhóm 2 — Năng lực Sale.
 *
 * Nhận structural type thay vì `SalePerformanceRow` để dùng chung cho cả một
 * hàng sale lẫn object tổng đã cộng dồn (`performanceTotals`) — trước đây hai
 * nơi lặp lại công thức và lệch nhau khi thêm trạng thái loại trừ mới.
 */
type ReachableCounters = Pick<
  SalePerformanceRow,
  "total_assessed" | "unreached" | "dirty" | "warranty" | "wants_store_visit"
>;

export function reachable(row: ReachableCounters): number {
  return row.total_assessed - row.unreached - row.dirty - row.warranty - row.wants_store_visit;
}

/**
 * Mẫu số "% chốt" của Nhóm 1 — tổng data trừ hai trạng thái nằm ngoài tầm tư
 * vấn của sale: khách bệnh nền (chống chỉ định) và khách muốn đến cửa hàng.
 */
type CloseRateCounters = Pick<
  SalePerformanceRow,
  "total" | "underlying_condition" | "wants_store_visit"
>;

export function closeRateDenominator(row: CloseRateCounters): number {
  return Math.max(0, row.total - row.underlying_condition - row.wants_store_visit);
}

/**
 * Mẫu số "% bom" của Nhóm 5a/5b — CỘNG TRỰC TIẾP hai rổ đã ngã ngũ:
 * `đơn hoàn + đơn giao thành công`. Đơn còn trong kho hoặc đang di chuyển bị
 * loại vì chưa biết khách có nhận hay không; để chúng trong mẫu số chẳng khác
 * nào mặc định coi đơn chưa có kết quả là giao thành công.
 *
 * CỐ Ý không viết `total − in_delivery`. Hai cách chỉ bằng nhau khi mọi đơn có
 * `status` nằm trong `OrderStatus`, mà `choices` của Django KHÔNG sinh ràng
 * buộc CHECK dưới DB — đơn sync từ KiotViet/đối tác vẫn ghi được mã lạ. Mã lạ
 * đó lọt vào phép trừ (làm phồng mẫu số, dìm % bom) nhưng không lọt vào phép
 * cộng. Tương tự khi thêm trạng thái mới vào enum mà quên cập nhật
 * `IN_DELIVERY_ORDER_STATUSES` / `BOMB_ORDER_STATUSES` ở backend.
 *
 * Dùng chung cho cả hai nhóm để công thức không lệch nhau lần nữa: trước
 * 2026-08-15 Nhóm 5b tính `returned / sent` (tử số chỉ status=5, mẫu số gồm cả
 * đơn đang giao) nên ra số thấp hơn Nhóm 5a nhiều lần trên cùng tập đơn.
 */
export function settledDeliveries(
  row: Pick<DeliveryQualityCounters, "bomb" | "delivered">,
): number {
  return row.bomb + row.delivered;
}

export function buildDateFilterValue(filters: SummaryFilters): DateFilterValue {
  if (filters.dateFrom || filters.dateTo) {
    return { option: "custom", from: filters.dateFrom, to: filters.dateTo };
  }
  const todayRange = getDateRange("today");
  return { option: "today", from: todayRange.from, to: todayRange.to };
}

export function sumDeliveryCounters(rows: Array<DeliveryQualityCounters>) {
  return rows.reduce(
    (acc, r) => ({
      total: acc.total + r.total,
      sent: acc.sent + r.sent,
      returned: acc.returned + r.returned,
      delivered: acc.delivered + r.delivered,
      in_delivery: acc.in_delivery + r.in_delivery,
      bomb: acc.bomb + r.bomb,
      pending_over_threshold: acc.pending_over_threshold + r.pending_over_threshold,
    }),
    {
      total: 0,
      sent: 0,
      returned: 0,
      delivered: 0,
      in_delivery: 0,
      bomb: 0,
      pending_over_threshold: 0,
    },
  );
}
