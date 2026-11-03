import { formatCurrency as formatCurrencyShared, formatNumber } from "@/lib/format";

import type { FoxiaGroupBy, FoxiaReportRow } from "@/lib/api/foxia-report";

/** Dấu gạch cho giá trị KHÔNG XÁC ĐỊNH (mẫu số 0), khác hẳn với số 0.
 *
 * "0đ mỗi đơn" đọc như quảng cáo miễn phí; dấu gạch nói đúng điều đang xảy ra —
 * chưa có dữ liệu để chia. */
export const EMPTY_VALUE = "—";

export function formatMoney(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return formatCurrencyShared(value, {
    fallback: "0",
    onInvalid: "fallback",
    maximumFractionDigits: 0,
  });
}

export function formatPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return `${value.toFixed(1)}%`;
}

export function formatRoas(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return `${value.toFixed(2)}x`;
}

export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined) return EMPTY_VALUE;
  return formatNumber(value);
}

export const GROUP_BY_OPTIONS: { value: FoxiaGroupBy; label: string }[] = [
  { value: "source", label: "Nguồn marketing" },
  { value: "channel", label: "Kênh marketing" },
  { value: "marketer", label: "Nhân viên marketing" },
  { value: "branch", label: "Chi nhánh" },
  { value: "brand", label: "Thương hiệu" },
];

/** Lát cắt quy được chi phí quảng cáo về nhóm.
 *
 * Tiền quảng cáo gắn với TÀI KHOẢN Ads, mà tài khoản chỉ ánh xạ được tới
 * nguồn/kênh. Nhóm theo nhân viên hay chi nhánh thì cột chi phí luôn bằng 0 —
 * phải ẩn hẳn thay vì hiện số 0 gây hiểu nhầm. */
export const GROUPS_WITH_SPEND: ReadonlySet<FoxiaGroupBy> = new Set(["source", "channel"]);

export function hasSpendColumns(groupBy: FoxiaGroupBy): boolean {
  return GROUPS_WITH_SPEND.has(groupBy);
}

/** Sắp xếp: nhóm đã ánh xạ trước (nhiều đơn lên trên), "Chưa ánh xạ" luôn cuối. */
export function sortRows(rows: FoxiaReportRow[]): FoxiaReportRow[] {
  return [...rows].sort((a, b) => {
    if (a.mapped !== b.mapped) return a.mapped ? -1 : 1;
    return b.orders - a.orders;
  });
}
