import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type PageCostRow,
  hasRevenueColumns,
  sortRowsByCost,
} from "@/lib/api/facebook_ads_page_report";

import { formatAdsCurrency, formatRatioPct } from "../report-grouping";
import { formatNumber } from "@/lib/format";

type PageCostTableProps = {
  rows: PageCostRow[];
  /** null = chưa go-live attribution → ẩn hẳn nhóm cột doanh thu. */
  revenueAvailableFrom: string | null;
};

/**
 * Bảng "Chi phí theo Page" của trang Báo cáo ads (chiều Page, giai đoạn A).
 * Khác bảng "Theo kênh": chưa có attribution doanh thu theo page nên nhóm cột
 * doanh thu/đơn chốt/CP-DT chỉ hiện khi backend xác nhận đã go-live
 * (revenue_available_from khác null) — ẩn hẳn thay vì hiện rỗng để tránh đọc
 * nhầm "page này tốn tiền mà không ra gì".
 */
export function PageCostTable({ rows, revenueAvailableFrom }: PageCostTableProps) {
  const showRevenue = hasRevenueColumns(revenueAvailableFrom);
  const sorted = sortRowsByCost(rows);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Chi phí theo Page</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="px-3 py-2 text-left font-medium">Page</th>
              <th className="px-3 py-2 text-center font-medium">Chi phí</th>
              <th className="px-3 py-2 text-center font-medium">Hiển thị</th>
              <th className="px-3 py-2 text-center font-medium">Click</th>
              {showRevenue ? (
                <>
                  <th className="px-3 py-2 text-center font-medium">Doanh thu</th>
                  <th className="px-3 py-2 text-center font-medium">Đơn chốt</th>
                  <th className="px-3 py-2 text-center font-medium">CP/DT</th>
                </>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => (
              <tr
                key={row.page_id || "__unknown__"}
                className="border-b border-border/40 last:border-b-0"
              >
                <td
                  className={`px-3 py-1.5 text-xs ${
                    row.page_id ? "font-medium text-foreground" : "italic text-muted-foreground"
                  }`}
                >
                  {row.page_name}
                </td>
                <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                  {formatAdsCurrency(Number(row.cost))}
                </td>
                <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                  {formatNumber(row.impressions)}
                </td>
                <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                  {formatNumber(row.clicks)}
                </td>
                {showRevenue ? (
                  <>
                    <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                      {row.revenue === null ? "—" : formatAdsCurrency(Number(row.revenue))}
                    </td>
                    <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                      {row.closed_orders === null ? "—" : formatNumber(row.closed_orders)}
                    </td>
                    <td className="px-3 py-1.5 text-center text-xs tabular-nums">
                      {formatRatioPct(row.ratio_pct)}
                    </td>
                  </>
                ) : null}
              </tr>
            ))}
            {sorted.length === 0 ? (
              <tr>
                <td
                  colSpan={showRevenue ? 7 : 4}
                  className="px-3 py-6 text-center text-xs text-muted-foreground"
                >
                  Chưa có dữ liệu chi phí trong khoảng đã chọn.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}
