import { useEffect, useMemo, useState } from "react";
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
import { TablePagination } from "@/components/ui/table-pagination";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { CHART_COLORS } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";
import { PAGE_SIZE_OPTIONS_COMPACT } from "@/lib/constants/pagination";
import { type TopProductRow, sumTopProducts } from "../overview-selectors";

/** Số SP vẽ trên biểu đồ; bảng chi tiết vẫn liệt kê đủ (có phân trang). */
const TOP_N = 10;
const DEFAULT_PAGE_SIZE = 20;

function money(value: number): string {
  return formatCurrency(value, { fallback: "0", onInvalid: "fallback", maximumFractionDigits: 0 });
}

function compactMoney(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)} tỷ`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} tr`;
  return money(value);
}

/**
 * Top sản phẩm theo doanh thu THUẦN cộng theo dòng hàng (user chốt 2026-09-03):
 * bar ngang top 10 + bảng đầy đủ có phân trang. Cùng khuôn với khối tỉnh/thành
 * ngay phía trên — nhiều hạng mục thì bar ngang một màu, không donut.
 *
 * Nằm DƯỚI CÙNG trang: xếp hạng SP là lớp chi tiết nhất, đọc sau khi đã nắm
 * tổng, kênh bán và địa lý.
 *
 * Trục Y hiện SKU (ngắn, ổn định) chứ không phải tên SP; tên đầy đủ nằm trong
 * bảng. Dòng chú thích nói rõ tổng các SP có thể lệch ô KPI Doanh thu thuần —
 * dòng hàng không gánh chiết khấu cấp đơn / phí ship.
 */
export function TopProductsCard({ rows }: { rows: TopProductRow[] }) {
  const { t } = useI18n();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(DEFAULT_PAGE_SIZE);

  const chartData = useMemo(
    () =>
      rows.slice(0, TOP_N).map((row) => ({
        label: row.label,
        name: row.name,
        revenue: row.revenue,
      })),
    [rows],
  );
  const totals = useMemo(() => sumTopProducts(rows), [rows]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);
  const pageStart = (page - 1) * pageSize;
  const pagedRows = useMemo(
    () => rows.slice(pageStart, pageStart + pageSize),
    [rows, pageStart, pageSize],
  );

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("overviewReport.topProductsTitle", "Top sản phẩm")}
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
              {t(
                "overviewReport.topProductsHint",
                "Top {n} sản phẩm theo doanh thu thuần, cộng theo dòng hàng — tổng các sản phẩm có thể lệch ô Doanh thu thuần vì chiết khấu cấp đơn và phí ship không nằm ở dòng hàng.",
              ).replace("{n}", String(Math.min(TOP_N, rows.length)))}
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
                  width={120}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "var(--muted)", fillOpacity: 0.35 }}
                  content={<ChartTooltip formatter={(entry) => money(Number(entry.value ?? 0))} />}
                />
                <Bar
                  dataKey="revenue"
                  name={t("overviewReport.netRevenueHeader", "Doanh thu thuần")}
                  radius={[0, 4, 4, 0]}
                  maxBarSize={18}
                >
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
                    <th className="w-12 px-3 py-2 font-medium">#</th>
                    <th className="px-3 py-2 font-medium">
                      {t("overviewReport.skuHeader", "SKU")}
                    </th>
                    <th className="px-3 py-2 font-medium">
                      {t("overviewReport.productNameHeader", "Tên sản phẩm")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.quantityHeader", "Số lượng")}
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
                  {pagedRows.map((row, index) => (
                    <tr key={row.key} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-2 text-muted-foreground">{pageStart + index + 1}</td>
                      <td className="px-3 py-2 font-medium text-foreground">{row.sku || "—"}</td>
                      <td className="px-3 py-2 text-foreground">{row.name || "—"}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{row.quantity}</td>
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
                    <td className="px-3 py-2" colSpan={3}>
                      {t("overviewReport.totalRow", "Tổng")}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">{totals.quantity}</td>
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
              <TablePagination
                className="mt-3 justify-end"
                summary={null}
                total={rows.length}
                page={page}
                pageSize={pageSize}
                totalPages={totalPages}
                pageSizeOptions={PAGE_SIZE_OPTIONS_COMPACT}
                pageSizeLabel={t("overviewReport.pagination.pageSize", "Mỗi trang")}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
                onPageChange={setPage}
              />
            </CollapsibleTable>
          </>
        )}
      </CardContent>
    </Card>
  );
}
