import { useMemo } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { LogoSpinner } from "@/components/ui/logo-spinner";
import { formatAdsCurrency, formatRatioPct } from "@/features/ads/report-grouping";
import { useI18n } from "@/i18n";

import { useSaleResaleReport } from "../queries";
import {
  type ResaleStaffRow,
  buildResaleKpis,
  buildResaleRows,
  sumResaleRows,
} from "../resale-selectors";
import { ResaleKpiTiles } from "./ResaleKpiTiles";
import { ResaleRevenueChart } from "./ResaleRevenueChart";
import { formatNumber } from "@/lib/format";

type SaleResaleTabProps = {
  dateFrom?: string;
  dateTo?: string;
};

function formatInt(value: number): string {
  return formatNumber(value);
}

/**
 * Tab "Resale" — đơn của KÊNH Resale, chia 4 rổ như Báo cáo tổng.
 *
 * Dùng bộ lọc ngày của trang. `Tabs` chỉ mount panel đang mở nên query chỉ chạy
 * khi người dùng vào tab này.
 */
export function SaleResaleTab({ dateFrom, dateTo }: SaleResaleTabProps) {
  const { t } = useI18n();
  const query = useSaleResaleReport({ dateFrom, dateTo });
  const unknownLabel = t("dashboard.unknownStaff", "Không xác định");
  const totalLabel = t("saleReport.totalRow", "Tổng");

  const failed = query.isError;
  const kpis = useMemo(
    () => buildResaleKpis(failed ? undefined : query.data?.kpis),
    [failed, query.data],
  );
  const rows = useMemo(
    () => buildResaleRows(failed ? [] : (query.data?.by_staff ?? []), unknownLabel),
    [failed, query.data, unknownLabel],
  );
  const totals = useMemo(() => sumResaleRows(rows, totalLabel), [rows, totalLabel]);

  const error = query.error
    ? query.error instanceof Error
      ? query.error.message
      : String(query.error)
    : null;

  const cells = (row: ResaleStaffRow) => (
    <>
      <td className="px-3 py-2 text-right tabular-nums">{formatInt(row.totalOrders)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatAdsCurrency(row.totalRevenue)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatInt(row.deliveredOrders)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatAdsCurrency(row.deliveredRevenue)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatAdsCurrency(row.awaitingRevenue)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatAdsCurrency(row.returnedRevenue)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatAdsCurrency(row.returnRiskRevenue)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatRatioPct(row.deliveredPct)}</td>
    </>
  );

  // Tiêu đề cột CỐ Ý khác chữ với nhãn ô KPI phía trên ("Tổng doanh thu",
  // "Giao thành công", "Chờ giao", "Hoàn", "Rủi ro hoàn"). Trùng chữ thì
  // `screen.getByText` trong test tìm ra 2 phần tử và ném lỗi, mà quan trọng hơn
  // là người đọc không phân biệt được ô tổng toàn kỳ với cột của từng nhân viên.
  const headers = [
    t("saleReport.totalOrdersHeader", "Tổng đơn"),
    t("saleReport.totalRevenueHeader", "Tổng DT"),
    t("saleReport.deliveredOrdersHeader", "Đơn giao TC"),
    t("saleReport.deliveredRevenueHeader", "DT giao TC"),
    t("saleReport.awaitingHeader", "DT chờ giao"),
    t("saleReport.returnedHeader", "DT hoàn"),
    t("saleReport.returnRiskHeader", "DT rủi ro hoàn"),
    t("saleReport.deliveredPctHeader", "% giao TC"),
  ];

  return (
    <div className="space-y-4">
      {error && (
        <Card className="rounded-xl border-destructive/50 bg-destructive/10">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}
      {query.isLoading ? (
        <Card className="rounded-xl border-border bg-card">
          <CardContent className="pt-6">
            <div className="flex min-h-40 items-center justify-center">
              <LogoSpinner size={36} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <ResaleKpiTiles kpis={kpis} />
          <Card className="rounded-xl border-border bg-card">
            <CardContent className="pt-6">
              {rows.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {t("saleReport.empty", "Chưa có dữ liệu.")}
                </p>
              ) : (
                <div className="space-y-6">
                  <ResaleRevenueChart
                    rows={rows}
                    seriesName={t("saleReport.deliveredRevenueSeries", "Doanh thu giao thành công")}
                  />
                  <div className="overflow-x-auto">
                    <table data-slot="table" className="w-full min-w-[980px] text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
                          <th className="px-3 py-2 text-left font-medium">
                            {t("saleReport.staffHeader", "Sale")}
                          </th>
                          {headers.map((header) => (
                            <th key={header} className="px-3 py-2 text-right font-medium">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.key}
                            className="border-b border-border/60 last:border-b-0 hover:bg-muted/40"
                          >
                            <td className="px-3 py-2 font-medium text-foreground">{row.label}</td>
                            {cells(row)}
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border font-semibold">
                          <td className="px-3 py-2">{totalLabel}</td>
                          {cells(totals)}
                        </tr>
                      </tfoot>
                    </table>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t(
                        "saleReport.resaleNote",
                        "Đơn resale = đơn thuộc kênh Resale. Doanh thu tính mọi đơn đã lên hóa đơn KiotViet trừ đơn huỷ, chia 4 rổ rời nhau như Báo cáo tổng: giao thành công + chờ giao + hoàn + rủi ro hoàn = tổng. Đơn đang chờ giao khi giao xong sẽ chuyển sang rổ giao thành công của chính kỳ đã tạo đơn, nên số của kỳ gần đây còn tăng.",
                      )}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
