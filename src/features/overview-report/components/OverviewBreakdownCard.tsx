import { useMemo } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CollapsibleTable } from "@/components/report/CollapsibleTable";
import { DonutChart } from "@/components/report/DonutChart";
import { useI18n } from "@/i18n";
import { formatCurrency } from "@/lib/format";
import { type BreakdownRow, sumBreakdownRows } from "../overview-selectors";
import { colorForSaleChannel } from "../sale-channels";

function money(value: number): string {
  return formatCurrency(value, { fallback: "0", onInvalid: "fallback", maximumFractionDigits: 0 });
}

type Props = {
  title: string;
  /** Nhãn cột đầu bảng (Kênh bán / Vùng miền). */
  nameHeader?: string;
  /** Nhãn cột giá trị (Doanh thu / Giá trị hoàn / Giá trị rủi ro hoàn). */
  valueHeader: string;
  /** Nhãn hiển thị ở tâm donut. */
  centerLabel: string;
  rows: BreakdownRow[];
  /**
   * Khối doanh thu hiện thêm cặp cột "giao thành công"; khối hoàn/rủi ro hoàn
   * hiện cột "% trên tổng" thay thế — đơn hoàn/rủi ro hoàn không thể là đơn
   * giao thành công.
   */
  variant: "revenue" | "amount";
  /** Màu theo entity (nhóm kênh bán hoặc vùng) — mặc định theo nhóm kênh bán. */
  colorOf?: (key: string) => string;
};

/**
 * Một khối phân bổ: donut tỉ trọng + bảng chi tiết xổ ra.
 * Cùng khuôn với khối phân bổ ở trang Báo cáo Ads (RevenueBreakdownCard).
 */
export function OverviewBreakdownCard({
  title,
  nameHeader,
  valueHeader,
  centerLabel,
  rows,
  variant,
  colorOf = colorForSaleChannel,
}: Props) {
  const { t } = useI18n();

  const slices = useMemo(
    () =>
      rows.map((row) => ({
        name: row.label,
        value: row.revenue,
        color: colorOf(row.key),
      })),
    [rows, colorOf],
  );
  const totals = useMemo(() => sumBreakdownRows(rows), [rows]);
  const showDelivered = variant === "revenue";

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("overviewReport.empty", "Chưa có dữ liệu.")}
          </p>
        ) : (
          <>
            <DonutChart
              slices={slices}
              centerValue={money(totals.revenue)}
              centerLabel={centerLabel}
              formatValue={money}
            />

            <CollapsibleTable label={t("dashboard.showDetailTable", "Xem bảng chi tiết")}>
              <table data-slot="table" className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-2 font-medium">
                      {nameHeader ?? t("overviewReport.saleChannelHeader", "Kênh bán")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">
                      {t("overviewReport.ordersHeader", "Số đơn")}
                    </th>
                    <th className="px-3 py-2 text-center font-medium">{valueHeader}</th>
                    {showDelivered ? (
                      <>
                        <th className="px-3 py-2 text-center font-medium">
                          {t("overviewReport.deliveredOrdersHeader", "Đơn giao thành công")}
                        </th>
                        <th className="px-3 py-2 text-center font-medium">
                          {t("overviewReport.deliveredRevenueHeader", "DT giao thành công")}
                        </th>
                      </>
                    ) : (
                      <th className="px-3 py-2 text-center font-medium">
                        {t("overviewReport.shareHeader", "% trên tổng")}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.key} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-2 font-medium text-foreground">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: colorOf(row.key) }}
                          />
                          {row.label}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{row.orders}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{money(row.revenue)}</td>
                      {showDelivered ? (
                        <>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {row.deliveredOrders ?? 0}
                          </td>
                          <td className="px-3 py-2 text-center tabular-nums">
                            {money(row.deliveredRevenue ?? 0)}
                          </td>
                        </>
                      ) : (
                        <td className="px-3 py-2 text-center tabular-nums">
                          {row.sharePct.toFixed(1)}%
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border font-semibold">
                    <td className="px-3 py-2">{t("overviewReport.totalRow", "Tổng")}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{totals.orders}</td>
                    <td className="px-3 py-2 text-center tabular-nums">{money(totals.revenue)}</td>
                    {showDelivered ? (
                      <>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {totals.deliveredOrders}
                        </td>
                        <td className="px-3 py-2 text-center tabular-nums">
                          {money(totals.deliveredRevenue)}
                        </td>
                      </>
                    ) : (
                      <td className="px-3 py-2 text-center tabular-nums">100.0%</td>
                    )}
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
