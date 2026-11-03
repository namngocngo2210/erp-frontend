import { useMemo } from "react";

import { formatAdsCurrency, formatRatioPct } from "@/features/ads/report-grouping";
import { useI18n } from "@/i18n";
import { type SaleMetricRow, formatLeadTime, sumSaleRows } from "../sale-report-selectors";
import { formatNumber } from "@/lib/format";

type SaleMetricTableProps = {
  rows: SaleMetricRow[];
  /** Tiêu đề cột đầu: "Sale" (tab tổng hợp) hoặc "Ngày" (tab chi tiết). */
  firstColumnHeader: string;
};

function formatInt(value: number): string {
  return formatNumber(value);
}

function formatDerivedCurrency(value: number | null): string {
  return value === null ? "—" : formatAdsCurrency(value);
}

/**
 * Bảng chỉ số dùng chung cho tab "Báo cáo theo sale" (mỗi hàng 1 nhân viên) và
 * "Báo cáo chi tiết theo sale" (mỗi hàng 1 ngày). Thứ tự cột đúng theo yêu cầu
 * (user chốt 2026-08-04): doanh thu tổng → DT xác nhận đơn → DT chốt đơn →
 * tỉ lệ chốt → số data nhận → số đơn hàng → AOV. Hai cột thời gian (2026-08-24)
 * thêm vào CUỐI để không xáo trộn thứ tự đã chốt, và xếp theo đúng thứ tự vòng
 * đời: chờ chia → xử lý. Cùng mẫu số nên cộng hai ô ra tổng thời gian từ lúc đơn
 * đổ về tới lúc tác nghiệp.
 */
export function SaleMetricTable({ rows, firstColumnHeader }: SaleMetricTableProps) {
  const { t } = useI18n();
  const totalLabel = t("saleReport.totalRow", "Tổng");
  const totals = useMemo(() => sumSaleRows(rows, totalLabel), [rows, totalLabel]);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("saleReport.empty", "Chưa có dữ liệu.")}</p>
    );
  }

  const cells = (row: SaleMetricRow) => (
    <>
      <td className="px-3 py-2 text-right tabular-nums">{formatAdsCurrency(row.totalRevenue)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatAdsCurrency(row.confirmedRevenue)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">{formatAdsCurrency(row.closedRevenue)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatRatioPct(row.closeRatePct)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatInt(row.dataCount)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatInt(row.orders)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatDerivedCurrency(row.aov)}</td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatLeadTime(row.avgQueueWaitSeconds)}
      </td>
      <td className="px-3 py-2 text-right tabular-nums">
        {formatLeadTime(row.avgLeadTimeSeconds)}
      </td>
    </>
  );

  return (
    <div className="overflow-x-auto">
      <table data-slot="table" className="w-full min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{firstColumnHeader}</th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.totalRevenueHeader", "Doanh thu tổng")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.confirmedRevenueHeader", "Doanh thu xác nhận đơn")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.closedRevenueHeader", "Doanh thu chốt đơn")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.closeRateHeader", "Tỉ lệ chốt đơn")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.dataCountHeader", "Số data nhận")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.ordersHeader", "Số đơn hàng")}
            </th>
            <th className="px-3 py-2 text-right font-medium">{t("saleReport.aovHeader", "AOV")}</th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.queueWaitHeader", "Thời gian chờ chia data")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("saleReport.leadTimeHeader", "Lead time xử lý data")}
            </th>
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
          "saleReport.revenueNote",
          "Doanh thu chỉ tính các đơn đã chốt / đã lên đơn (Tổng = Xác nhận + Chốt). Xác nhận đơn = tiền khách tự đăng ký trên landing lúc đơn đổ về; Chốt đơn = phần sale tư vấn thêm. Đơn không qua landing (tạo tay, fanpage) tính toàn bộ vào Chốt đơn.",
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {t(
          "saleReport.leadTimeNote",
          "Hai cột thời gian đo hai chặng liên tiếp của cùng một tập đơn, cộng lại bằng tổng thời gian từ lúc đơn đổ về tới lúc tác nghiệp. Chờ chia data = từ lúc đơn đổ về tới lúc data đến tay sale (data về ngoài giờ làm việc phải đợi ca sau mới được chia). Lead time xử lý data = từ lúc nhận data tới lần đầu nhập kết quả tác nghiệp (đổi trạng thái sale). Data chưa được xử lý không tính vào cả hai cột; mỗi chặng được cắt trần ở 7 ngày để một data bị bỏ quên không kéo lệch cả kỳ.",
        )}
      </p>
    </div>
  );
}
