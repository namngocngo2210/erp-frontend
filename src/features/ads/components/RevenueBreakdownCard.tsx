import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { DonutChart } from "@/components/report/DonutChart";
import { ENTITY_PALETTE } from "@/features/dashboard/dashboard-constants";
import { useI18n } from "@/i18n";
import { type BreakdownRevenueRow, buildDonutSlices } from "../ads-report-selectors";
import { formatAdsCurrency as formatCurrency } from "../report-grouping";

type Props = {
  title: string;
  /** Nhãn cột đầu của bảng chi tiết (Tỉnh/thành, Giới tính...). */
  nameHeader: string;
  rows: BreakdownRevenueRow[];
};

/** Số lát tối đa của donut — phần đuôi gộp thành lát "Khác" cho dễ đọc. */
const MAX_DONUT_SLICES = 8;

/**
 * Khối phân bổ đơn chốt/doanh thu theo một thuộc tính khách hàng
 * (tỉnh/thành, giới tính): donut tỉ trọng doanh thu + bảng chi tiết.
 * Không có cột chi phí — chi phí ads không tách được theo thuộc tính này.
 */
export function RevenueBreakdownCard({ title, nameHeader, rows }: Props) {
  const { t } = useI18n();

  const donutSlices = useMemo(
    () =>
      buildDonutSlices(
        rows.map((row) => ({ name: row.label, value: Number(row.revenue || 0) })),
        MAX_DONUT_SLICES,
        t("adsReport.otherSlice", "Khác"),
      ).map((slice, idx) => ({
        ...slice,
        color: ENTITY_PALETTE[idx % ENTITY_PALETTE.length],
      })),
    [rows, t],
  );

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, row) => ({
          closedOrders: acc.closedOrders + (row.closed_orders || 0),
          revenue: acc.revenue + Number(row.revenue || 0),
          deliveredOrders: acc.deliveredOrders + (row.delivered_orders || 0),
          deliveredRevenue: acc.deliveredRevenue + Number(row.delivered_revenue || 0),
        }),
        { closedOrders: 0, revenue: 0, deliveredOrders: 0, deliveredRevenue: 0 },
      ),
    [rows],
  );

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("adsReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <DonutChart
              slices={donutSlices}
              centerValue={formatCurrency(totals.revenue)}
              centerLabel={t("adsReport.kpi.revenue", "Tổng doanh thu")}
              formatValue={(value) => formatCurrency(value)}
            />

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">{nameHeader}</th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.closedOrdersHeader", "Đơn đã chốt")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.deliveredOrdersHeader", "Đơn giao thành công")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.revenueHeader", "Doanh thu")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("adsReport.deliveredRevenueHeader", "Doanh thu giao thành công")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.label} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{row.closed_orders}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{row.delivered_orders}</td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">
                        {formatCurrency(row.delivered_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2">{t("adsReport.totalRow", "Tổng")}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totals.closedOrders}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totals.deliveredOrders}</td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatCurrency(totals.revenue)}
                    </td>
                    <td className="px-3 py-2 text-center tabular-nums">
                      {formatCurrency(totals.deliveredRevenue)}
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
