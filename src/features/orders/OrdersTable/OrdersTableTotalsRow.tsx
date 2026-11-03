import { memo, useMemo } from "react";

import { TableCell, TableFooter, TableRow } from "@/components/ui/table";
import type { OrderColumnKey, OrderRow } from "@/features/orders/order-types";
import { useI18n } from "@/i18n";

import { formatAmount, getColumnConfig } from "./constants";
import { sumPageAmountAfterDiscount, TOTALS_COLUMN_KEY } from "./order-totals";

type Props = {
  rows: ReadonlyArray<OrderRow>;
  orderedColumns: OrderColumnKey[];
  stickySet: ReadonlySet<OrderColumnKey>;
  lockedLeftByKey: Partial<Record<OrderColumnKey, number>>;
};

const FOOTER_BG = "var(--muted)";

/**
 * Dòng tổng dính đáy bảng đơn: ô cột "Tổng sau giảm giá" hiện tổng các dòng ĐANG
 * HIỂN THỊ (trang hiện tại, theo page size đang chọn). Cột ghim giữ đúng offset
 * sticky như dòng dữ liệu để không lệch khi cuộn ngang.
 */
function OrdersTableTotalsRowImpl({ rows, orderedColumns, stickySet, lockedLeftByKey }: Props) {
  const { t } = useI18n();
  const pageSum = useMemo(() => sumPageAmountAfterDiscount(rows), [rows]);
  const lockedOrdered = useMemo(
    () => orderedColumns.filter((columnKey) => stickySet.has(columnKey)),
    [orderedColumns, stickySet],
  );

  return (
    <TableFooter className="sticky bottom-0 z-20 border-t-2 border-border bg-muted font-semibold">
      <TableRow className="hover:bg-muted">
        <TableCell
          className="w-12 px-2 py-1.5 text-center text-xs uppercase"
          style={{ position: "sticky", left: 0, zIndex: 10, backgroundColor: FOOTER_BG }}
        >
          {t("orders.totals.label", "Tổng")}
        </TableCell>
        {orderedColumns.map((columnKey) => {
          if (!getColumnConfig(columnKey)) return null;
          const isLocked = stickySet.has(columnKey);
          const stickyStyle = isLocked
            ? {
                position: "sticky" as const,
                left: `${lockedLeftByKey[columnKey] ?? 0}px`,
                zIndex: 10 - lockedOrdered.indexOf(columnKey),
                backgroundColor: FOOTER_BG,
                boxShadow: "1px 0 0 0 var(--border)",
              }
            : {};
          if (columnKey !== TOTALS_COLUMN_KEY) {
            return <TableCell key={columnKey} className="px-2 py-1.5" style={stickyStyle} />;
          }
          return (
            <TableCell
              key={columnKey}
              className="whitespace-nowrap px-2 py-1.5 text-sm text-primary"
              style={stickyStyle}
              data-testid="orders-total-after-discount"
              title={t("orders.totals.amountAfterDiscount", "Tổng sau giảm giá")}
            >
              {formatAmount(pageSum)}
            </TableCell>
          );
        })}
      </TableRow>
    </TableFooter>
  );
}

export const OrdersTableTotalsRow = memo(OrdersTableTotalsRowImpl);

/** Điện thoại: thanh tổng gọn dưới danh sách thẻ (thẻ không có cột để canh hàng). */
export function OrdersMobileTotalsBar({ rows }: Pick<Props, "rows">) {
  const { t } = useI18n();
  const pageSum = useMemo(() => sumPageAmountAfterDiscount(rows), [rows]);
  return (
    <div
      className="flex items-center justify-between gap-2 border-t border-border bg-muted px-3 py-2 text-sm"
      data-testid="orders-mobile-total-after-discount"
    >
      <span className="text-muted-foreground">{t("orders.totals.label", "Tổng")}</span>
      <span className="font-semibold text-primary">{formatAmount(pageSum)}</span>
    </div>
  );
}
