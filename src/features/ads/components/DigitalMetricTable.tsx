import { Fragment, useMemo } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

import { LogoSpinner } from "@/components/ui/logo-spinner";
import { useI18n } from "@/i18n";
import {
  type DigitalMetricRow,
  type DigitalProductExpansion,
  sumDigitalRows,
} from "../digital-report-selectors";
import { formatAdsCurrency, formatRatioPct } from "../report-grouping";
import { formatNumber } from "@/lib/format";

/** Phần bung của một hàng; `null` = đang tải. */
export type DigitalRowExpansion = DigitalProductExpansion | null;

type DigitalMetricTableProps = {
  rows: DigitalMetricRow[];
  /** Tiêu đề cột đầu: "Digital" (tab tổng hợp) hoặc "Ngày" (tab chi tiết). */
  firstColumnHeader: string;
  /** Bỏ dòng "Tổng" (dòng đầu bảng) — không dùng ở đâu hiện tại nhưng giữ cho bảng nhúng. */
  hideTotals?: boolean;
  /** Bật nút bung hàng ra chi tiết theo sản phẩm (cần cả `onToggleRow` lẫn `getExpansion`). */
  expandedKeys?: ReadonlySet<string>;
  onToggleRow?: (key: string) => void;
  /** Chỉ được gọi cho hàng đang bung. Trả `null` khi dữ liệu còn đang tải. */
  getExpansion?: (row: DigitalMetricRow) => DigitalRowExpansion;
};

/** Số cột của bảng — dùng cho colSpan của các dòng ghi chú trong phần bung. */
const COLUMN_COUNT = 9;

function formatInt(value: number): string {
  return formatNumber(value);
}

/** Tiền dẫn xuất (CPL, AOV): mẫu số 0 → "—" thay vì hiện 0 gây hiểu nhầm. */
function formatDerivedCurrency(value: number | null): string {
  return value === null ? "—" : formatAdsCurrency(value);
}

/**
 * Bảng chỉ số dùng chung cho tab "Báo cáo theo digital" (mỗi hàng 1 kênh) và
 * "Báo cáo chi tiết theo digital" (mỗi hàng 1 ngày). Thứ tự cột đúng theo yêu
 * cầu nghiệp vụ: doanh thu → chi phí → ME/RE → số data → CPL → số đơn → AOV →
 * tỉ lệ chốt.
 *
 * Bung hàng: dòng con là các SẢN PHẨM có chiến dịch trong TKQC gắn vào kênh đó.
 * Dòng con dùng LẠI đúng hàm `cells()` của dòng cha nên không có đường nào làm
 * lệch cột giữa hai tầng.
 */
export function DigitalMetricTable({
  rows,
  firstColumnHeader,
  hideTotals = false,
  expandedKeys,
  onToggleRow,
  getExpansion,
}: DigitalMetricTableProps) {
  const { t } = useI18n();
  const totalLabel = t("adsReport.totalRow", "Tổng");
  const totals = useMemo(() => sumDigitalRows(rows, totalLabel), [rows, totalLabel]);
  const expandable = Boolean(onToggleRow && getExpansion);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("adsReport.empty", "Chưa có dữ liệu.")}</p>
    );
  }

  const cells = (row: DigitalMetricRow) => (
    <>
      <td className="px-3 py-2 text-right tabular-nums">{formatAdsCurrency(row.revenue)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatAdsCurrency(row.cost)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatRatioPct(row.meRePct)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatInt(row.leads)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatDerivedCurrency(row.cpl)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatInt(row.orders)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatDerivedCurrency(row.aov)}</td>
      <td className="px-3 py-2 text-right tabular-nums">{formatRatioPct(row.closeRatePct)}</td>
    </>
  );

  const renderExpansion = (row: DigitalMetricRow) => {
    const expansion = getExpansion?.(row) ?? null;
    if (expansion === null) {
      return (
        <tr className="bg-muted/20">
          <td colSpan={COLUMN_COUNT} className="px-3 py-4">
            <div className="flex items-center justify-center">
              <LogoSpinner size={24} />
            </div>
          </td>
        </tr>
      );
    }
    if (expansion.rows.length === 0) {
      return (
        <tr className="bg-muted/20">
          <td colSpan={COLUMN_COUNT} className="py-3 pl-10 pr-3 text-sm text-muted-foreground">
            {t(
              "adsReport.noProductRows",
              "Chưa có chiến dịch nào gắn sản phẩm trong các TKQC của kênh này.",
            )}
          </td>
        </tr>
      );
    }
    return (
      <>
        {expansion.rows.map((child) => (
          <tr key={child.key} className="border-b border-border/40 bg-muted/20">
            <td className="py-2 pl-10 pr-3">
              <div className="text-foreground">{child.label}</div>
              {child.sublabel && (
                <div className="text-xs text-muted-foreground">{child.sublabel}</div>
              )}
            </td>
            {cells(child)}
          </tr>
        ))}
        {expansion.revenueGap > 0 && (
          <tr className="border-b border-border/40 bg-muted/20">
            <td colSpan={COLUMN_COUNT} className="py-2 pl-10 pr-3 text-xs text-muted-foreground">
              {t("adsReport.productRevenueGap", "Còn")}{" "}
              <span className="font-medium tabular-nums">
                {formatAdsCurrency(expansion.revenueGap)}
              </span>{" "}
              {t(
                "adsReport.productRevenueGapTail",
                "doanh thu của sản phẩm không có chiến dịch nào — không tách thành dòng.",
              )}
            </td>
          </tr>
        )}
      </>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table data-slot="table" className="w-full min-w-[860px] text-sm">
        <thead>
          <tr className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2 text-left font-medium">{firstColumnHeader}</th>
            <th className="px-3 py-2 text-right font-medium">
              {t("adsReport.revenueHeader", "Doanh thu")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("adsReport.costHeader", "Chi phí")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("adsReport.meReHeader", "ME/RE")}
            </th>
            <th className="px-3 py-2 text-right font-medium">
              {t("adsReport.leadsHeader", "Số data")}
            </th>
            <th className="px-3 py-2 text-right font-medium">{t("adsReport.cplHeader", "CPL")}</th>
            <th className="px-3 py-2 text-right font-medium">
              {t("adsReport.ordersHeader", "Số đơn hàng")}
            </th>
            <th className="px-3 py-2 text-right font-medium">{t("adsReport.aovHeader", "AOV")}</th>
            <th className="px-3 py-2 text-right font-medium">
              {t("adsReport.closeRateHeader", "Tỉ lệ chốt")}
            </th>
          </tr>
        </thead>
        <tbody>
          {!hideTotals && (
            <tr className="border-b-2 border-border bg-muted/40 font-semibold">
              <td className="px-3 py-2">
                <div className="flex items-start gap-1.5">
                  {/* Chừa đúng chỗ của nút bung ở các dòng dưới để nhãn "Tổng" thẳng cột. */}
                  {expandable && <span aria-hidden className="mt-0.5 size-4" />}
                  <div>{totalLabel}</div>
                </div>
              </td>
              {cells(totals)}
            </tr>
          )}
          {rows.map((row) => {
            const isExpanded = expandedKeys?.has(row.key) ?? false;
            return (
              <Fragment key={row.key}>
                <tr
                  className={`border-b border-border/60 last:border-b-0 hover:bg-muted/40 ${
                    expandable ? "cursor-pointer" : ""
                  }`}
                  onClick={expandable ? () => onToggleRow?.(row.key) : undefined}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-start gap-1.5">
                      {expandable && (
                        <button
                          type="button"
                          aria-expanded={isExpanded}
                          aria-label={
                            isExpanded
                              ? t("adsReport.collapseRow", "Thu gọn")
                              : t("adsReport.expandRow", "Xem theo sản phẩm")
                          }
                          className="mt-0.5 text-muted-foreground hover:text-foreground"
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleRow?.(row.key);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="size-4" />
                          ) : (
                            <ChevronRight className="size-4" />
                          )}
                        </button>
                      )}
                      <div>
                        <div className="font-medium text-foreground">{row.label}</div>
                        {row.sublabel && (
                          <div className="text-xs text-muted-foreground">{row.sublabel}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  {cells(row)}
                </tr>
                {isExpanded && renderExpansion(row)}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
