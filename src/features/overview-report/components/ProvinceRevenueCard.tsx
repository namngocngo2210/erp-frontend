import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { CHART_COLORS } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";
import { type BreakdownRow, sumBreakdownRows } from "../overview-selectors";

/** Số tỉnh vẽ trên biểu đồ; phần còn lại vẫn có đủ trong bảng chi tiết. */
const TOP_N = 10;

function money(value: number): string {
  return formatCurrency(value, { fallback: "0", onInvalid: "fallback", maximumFractionDigits: 0 });
}

function compactMoney(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} tr`;
  return money(value);
}

/**
 * Doanh thu THUẦN (tổng trừ hoàn) theo tỉnh/thành: bar ngang top 10 + bảng đầy
 * đủ. Cùng cơ sở với khối vùng miền — tỉnh cộng lên đúng bằng vùng; ba khối theo
 * kênh bán thì vẫn ở cơ sở tổng (user chốt 2026-08-22).
 *
 * Cố ý KHÔNG dùng biểu đồ tròn như khối nguồn/vùng: 60+ tỉnh thì donut không
 * đọc được, và so sánh độ lớn giữa nhiều hạng mục là việc của bar chart. Bar
 * dùng MỘT màu — mỗi cột đã có nhãn tên tỉnh nên màu không phải mang thông tin.
 */
export function ProvinceRevenueCard({ rows }: { rows: BreakdownRow[] }) {
  const { t } = useI18n();

  const chartData = useMemo(
    () =>
      rows.slice(0, TOP_N).map((row) => ({
        label: row.label,
        revenue: row.revenue,
        deliveredRevenue: row.deliveredRevenue ?? 0,
        orders: row.orders,
      })),
    [rows],
  );
  const totals = useMemo(() => sumBreakdownRows(rows), [rows]);

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("overviewReport.revenueByProvinceTitle", "Doanh thu thuần theo tỉnh/thành")}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("overviewReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <p className="mb-2 text-xs text-muted-foreground">
              {t("overviewReport.provinceChartHint", "Top {n} tỉnh/thành theo doanh thu").replace(
                "{n}",
                String(Math.min(TOP_N, rows.length)),
              )}
            </p>
            <ResponsiveContainer width="100%" height={Math.max(240, chartData.length * 34)}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
              >
                <CartesianGrid
                  strokeDasharray="2 4"
                  stroke="var(--border)"
                  strokeOpacity={0.55}
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickFormatter={compactMoney}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                  content={<ChartTooltip formatter={(entry) => money(Number(entry.value ?? 0))} />}
                />
                <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={18}>
                  {chartData.map((row) => (
                    <Cell key={row.label} fill={CHART_COLORS.blue} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">
                      {t("overviewReport.provinceHeader", "Tỉnh/thành")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.ordersHeader", "Số đơn")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.netRevenueHeader", "Doanh thu thuần")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.shareHeader", "% trên tổng")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.deliveredOrdersHeader", "Đơn giao thành công")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.deliveredRevenueHeader", "DT giao thành công")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{row.orders}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{money(row.revenue)}</td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {row.sharePct.toFixed(1)}%
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {row.deliveredOrders ?? 0}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {money(row.deliveredRevenue ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2">{t("overviewReport.totalRow", "Tổng")}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totals.orders}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{money(totals.revenue)}</td>
                    <td className="px-3 py-2 text-center tabular-nums">100.0%</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totals.deliveredOrders}</td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {money(totals.deliveredRevenue)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
