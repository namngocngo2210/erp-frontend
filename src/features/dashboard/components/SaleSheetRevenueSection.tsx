import { Fragment, useMemo } from "react";
import { Inbox } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import type { useI18n } from "@/i18n";

import { formatCurrency, resolveDisplayName } from "../dashboard-utils";
import {
  buildSaleSheetMatrix,
  SALE_SHEET_REPORT_KEYS,
  SALE_SHEET_REPORT_LABELS,
  type SaleSheetCell,
} from "../sale-sheet-revenue";
import type { SaleSheetRevenueRow } from "../types";
import { formatNumber } from "@/lib/format";

type Translate = ReturnType<typeof useI18n>["t"];

/**
 * Nhóm 10 — đơn chốt, đơn hoàn và doanh thu của từng sale, tách theo 3 tab của
 * trang Landing. Hàng = nhân viên, mỗi sheet chiếm 4 cột, nhóm cột "Tổng" ở
 * cuối là cộng ngang (không phải chỉ số mới).
 *
 * Chỉ nhìn 4 nguồn lead nội bộ — đơn sàn / KOC / KOL (tên cũ của KOC) / chưa
 * gắn nguồn đã bị backend loại, nên tổng ở đây CỐ Ý nhỏ hơn Nhóm 9.
 */
export function SaleSheetRevenueSection({
  t,
  rows,
  unknownStaffLabel,
}: {
  t: Translate;
  rows: readonly SaleSheetRevenueRow[] | undefined;
  unknownStaffLabel: string;
}) {
  const matrix = useMemo(() => buildSaleSheetMatrix(rows), [rows]);

  const groups = [
    ...SALE_SHEET_REPORT_KEYS.map((sheet) => ({
      key: sheet as string,
      label: SALE_SHEET_REPORT_LABELS[sheet],
    })),
    { key: "total", label: t("dashboard.totalRow", "Tổng") },
  ];

  const renderCells = (cell: SaleSheetCell, key: string, bold: boolean) => {
    const cls = bold ? "py-2 pr-4 text-right font-semibold" : "py-2 pr-4 text-right";
    return (
      <Fragment key={key}>
        <td className={`${cls} border-l border-border`}>{formatNumber(cell.closedOrders)}</td>
        <td className={cls}>{formatCurrency(cell.closedRevenue)}</td>
        <td className={cls}>{formatNumber(cell.returnedOrders)}</td>
        <td className={cls}>{formatCurrency(cell.netRevenue)}</td>
      </Fragment>
    );
  };

  const metricHeaders = [
    t("dashboard.sourceClosedOrders", "Số đơn chốt"),
    t("dashboard.sourceClosedRevenue", "Tổng doanh thu"),
    t("dashboard.sourceReturnedOrders", "Số đơn hoàn"),
    t("dashboard.sourceNetRevenue", "DThu giao thành công"),
  ];

  return (
    <Card className="rounded-xl border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t(
            "dashboard.saleSheetRevenueTitle",
            "Nhóm 10 — Đơn chốt, đơn hoàn & doanh thu theo Sale và tab Landing",
          )}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {t(
            "dashboard.saleSheetRevenueHint",
            'Chia theo 3 tab của trang Đơn hàng Landing. Tab "Tư vấn" gồm đơn đổ về không có địa chỉ hoặc thiếu Tên/SĐT — đơn đã vào Tư vấn thì ở lại đó kể cả sau khi sale điền đủ thông tin, nên cột này là doanh thu chốt được từ data không địa chỉ. Chỉ tính đơn có nguồn Landing / Zalo / Messenger / Hotline — không gồm đơn sàn (TikTok, Shopee), đơn KOC/KOL và đơn chưa gắn nguồn, nên tổng ở đây nhỏ hơn Nhóm 9. Số đơn chốt = đơn ở trạng thái Đã chốt / Hoả tốc / Đã lên đơn (KHÔNG gồm "Đã chốt, hẹn ngày"); tổng doanh thu là tiền của chính các đơn đó. Số đơn hoàn = trong số đó, đơn đang hoàn hoặc đã hoàn. DThu giao thành công = tiền của đúng các đơn đã giao xong (trạng thái Đã giao), KHÔNG gồm đơn còn trong kho / đang đi đường / chờ giao lại — cùng tiêu chí giao TC của Nhóm 4. Vì vậy ở kỳ vừa chốt xong, cột này thấp hơn hẳn Tổng doanh thu và phần chênh KHÔNG chỉ là đơn hoàn. Đơn đã huỷ không tính ở cột nào. Riêng đơn đổ về TRƯỚC ngày triển khai migration 0094 không có cờ này nên không "dính" lại Tư vấn, khiến số liệu cột này ở các kỳ cũ thấp hơn thực tế.',
          )}
        </p>
      </CardHeader>
      <CardContent>
        {matrix.rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title={t("dashboard.empty", "Không có dữ liệu để hiển thị")}
            className="py-6"
          />
        ) : (
          <div className="overflow-x-auto">
            <table data-slot="table" className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th
                    rowSpan={2}
                    className="sticky left-0 z-10 bg-card py-2 pr-4 text-left align-bottom font-medium"
                  >
                    {t("dashboard.staffColumn", "Nhân viên")}
                  </th>
                  {groups.map((group) => (
                    <th
                      key={group.key}
                      colSpan={4}
                      className="border-l border-border py-2 pr-4 text-center font-medium"
                    >
                      {group.label}
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-border text-muted-foreground">
                  {groups.map((group) =>
                    metricHeaders.map((label, index) => (
                      <th
                        key={`${group.key}-${label}`}
                        className={`py-2 pr-4 text-right text-xs font-medium whitespace-nowrap ${
                          index === 0 ? "border-l border-border" : ""
                        }`}
                      >
                        {label}
                      </th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {matrix.rows.map((row) => (
                  <tr
                    key={String(row.staffId ?? row.staff__username ?? "unknown")}
                    className="border-b border-border/60 transition-colors hover:bg-muted/50"
                  >
                    <td
                      className="sticky left-0 z-10 bg-card py-2 pr-4 text-foreground"
                      data-testid="sale-sheet-staff"
                    >
                      {resolveDisplayName(row, unknownStaffLabel)}
                    </td>
                    {row.cells.map((cell, index) =>
                      renderCells(cell, `${row.staffId}-${SALE_SHEET_REPORT_KEYS[index]}`, false),
                    )}
                    {renderCells(row.total, `${row.staffId}-total`, true)}
                  </tr>
                ))}
                <tr data-testid="sale-sheet-total-row" className="font-semibold text-foreground">
                  <td className="sticky left-0 z-10 bg-card py-2 pr-4">
                    {t("dashboard.totalRow", "Tổng")}
                  </td>
                  {matrix.totals.cells.map((cell, index) =>
                    renderCells(cell, `totals-${SALE_SHEET_REPORT_KEYS[index]}`, true),
                  )}
                  {renderCells(matrix.totals.total, "totals-total", true)}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
