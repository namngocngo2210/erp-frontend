import { useMemo } from "react";
import { Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPercent } from "@/lib/metrics";
import type { useI18n } from "@/i18n";

import { formatCurrency, resolveDisplayName } from "../dashboard-utils";
import type { SalePerformanceRow } from "../types";
import { formatNumber } from "@/lib/format";

type Translate = ReturnType<typeof useI18n>["t"];

/** Tổng đã cộng dồn ở useDashboardSummary — chỉ lấy các field khối này dùng. */
type ClosedRevenueTotals = {
  total: number;
  closed_revenue_orders: number;
  closed_revenue: number;
};

/**
 * Nhóm 9 — bảng tổng kết cuối trang Báo cáo Sale: mỗi sale được chia bao nhiêu
 * data, chốt được bao nhiêu đơn và bao nhiêu tiền.
 *
 * `total` dùng lại đúng field của Nhóm 1 nên cột "Data được chia" luôn khớp
 * giữa hai nhóm. Cột "Số đơn chốt" dùng `closed_revenue_orders` — cùng tiêu chí
 * lọc với cột tiền `closed_revenue` (đơn ở trạng thái chốt, gồm cả đơn sau đó bị
 * hoàn, KHÔNG gồm "đã chốt, hẹn ngày") — khác `revenue` của Nhóm 4 vốn chỉ tính
 * đơn giao thành công. Vì vậy Nhóm 9 không còn khớp tuyệt đối với `closed` của
 * Nhóm 1 — lệch đúng bằng số đơn "đã chốt, hẹn ngày".
 *
 * Bảng hiển thị mở sẵn (không bọc CollapsibleTable) vì đây là bảng tổng kết —
 * người dùng cần liếc là thấy, không phải bấm mở.
 */
export function ClosedRevenueSection({
  t,
  performanceRows,
  performanceTotals,
  unknownStaffLabel,
}: {
  t: Translate;
  performanceRows: readonly SalePerformanceRow[];
  performanceTotals: ClosedRevenueTotals;
  unknownStaffLabel: string;
}) {
  // Sắp xếp doanh thu giảm dần trên bản sao — mảng gốc còn được các nhóm khác
  // dùng chung (thứ tự theo username), không được mutate.
  const rows = useMemo(
    () =>
      [...performanceRows].sort(
        (a, b) => Number(b.closed_revenue || 0) - Number(a.closed_revenue || 0),
      ),
    [performanceRows],
  );

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("dashboard.closedRevenueTitle", "Nhóm 9 — Data chia & doanh thu chốt theo Sale")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.closedRevenueHint",
            'Doanh thu chốt = tổng tiền các đơn đã có đánh giá ở trạng thái Đã chốt / Hoả tốc / Đã lên đơn — KHÔNG gồm "Đã chốt, hẹn ngày". Tính cả đơn sau đó bị hoàn; không tính đơn đã huỷ. Vì vậy số đơn ở đây nhỏ hơn cột Tổng chốt của Nhóm 1. Nhóm 4 dùng tiêu chí khác — chỉ đơn đã giao thành công, không xét đánh giá.',
          )}
        </p>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("dashboard.empty", "Không có dữ liệu để hiển thị")}
            className="py-6"
          />
        ) : (
          <div className="overflow-x-auto">
            <table data-slot="table" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-medium">
                    {t("dashboard.staffColumn", "Nhân viên")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("dashboard.assignedDataColumn", "Data được chia")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("dashboard.closedOrdersColumn", "Số đơn chốt")}
                  </th>
                  <th className="py-2 pr-4 text-right font-medium">
                    {t("dashboard.closeRateColumn", "% chốt")}
                  </th>
                  <th className="py-2 text-right font-medium">
                    {t("dashboard.closedRevenueColumn", "Doanh thu chốt")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={String(row.staff_id ?? "unknown")}
                    className="border-b border-border/60 transition-colors hover:bg-muted/50"
                  >
                    <td className="py-2 pr-4 text-foreground" data-testid="closed-revenue-staff">
                      {resolveDisplayName(row, unknownStaffLabel)}
                    </td>
                    <td className="py-2 pr-4 text-right text-foreground">
                      {formatNumber(row.total)}
                    </td>
                    <td className="py-2 pr-4 text-right text-foreground">
                      {formatNumber(row.closed_revenue_orders)}
                    </td>
                    <td className="py-2 pr-4 text-right text-foreground">
                      {formatPercent(row.closed_revenue_orders, row.total)}
                    </td>
                    <td className="py-2 text-right font-semibold text-foreground">
                      {formatCurrency(row.closed_revenue)}
                    </td>
                  </tr>
                ))}
                <tr data-testid="closed-revenue-total-row">
                  <td className="py-2 pr-4 text-sm font-semibold text-foreground">
                    {t("dashboard.totalRow", "Tổng")}
                  </td>
                  <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                    {formatNumber(performanceTotals.total)}
                  </td>
                  <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                    {formatNumber(performanceTotals.closed_revenue_orders)}
                  </td>
                  <td className="py-2 pr-4 text-right text-sm font-semibold text-foreground">
                    {formatPercent(
                      performanceTotals.closed_revenue_orders,
                      performanceTotals.total,
                    )}
                  </td>
                  <td className="py-2 text-right text-sm font-semibold text-foreground">
                    {formatCurrency(performanceTotals.closed_revenue)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
