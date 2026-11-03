import { memo } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeCellSelect } from "@/components/ui/native-cell-select";
import { TablePagination } from "@/components/ui/table-pagination";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useI18n } from "@/i18n";
import { MOBILE_VIEWPORT_QUERY } from "@/lib/constants/layout";

import { ORDERS_PAGE_SIZE_OPTIONS } from "./constants";

type Props = {
  rowsCount: number;
  ordersPage: number;
  ordersPageSize: number;
  ordersHasNextPage: boolean;
  ordersTotalCount: number;
  isLoading: boolean;
  onPageSizeChange: (value: string) => void;
  /** Nhận trang 0-based (giữ quy ước ordersPage hiện có). */
  onPageChange: (page: number) => void;
};

function OrdersPaginationImpl({
  rowsCount,
  ordersPage,
  ordersPageSize,
  ordersHasNextPage,
  ordersTotalCount,
  isLoading,
  onPageSizeChange,
  onPageChange,
}: Props) {
  const { t } = useI18n();
  // totalCount có thể lệch/chưa kịp về trong khi has_next=true → nới thêm 1 trang.
  const knownTotalPages = Math.max(1, Math.ceil(ordersTotalCount / Math.max(1, ordersPageSize)));
  const totalPages = ordersHasNextPage
    ? Math.max(knownTotalPages, ordersPage + 2)
    : knownTotalPages;
  const isMobileViewport = useMediaQuery(MOBILE_VIEWPORT_QUERY);
  if (isMobileViewport) {
    return (
      <MobileOrdersPagination
        page={ordersPage}
        totalPages={totalPages}
        pageSize={ordersPageSize}
        totalCount={ordersTotalCount}
        disabled={isLoading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    );
  }
  return (
    <TablePagination
      className="mt-2 shrink-0 rounded-lg border border-border bg-muted/20 px-2.5 py-1.5"
      total={ordersTotalCount}
      page={ordersPage + 1}
      pageSize={ordersPageSize}
      totalPages={totalPages}
      disabled={isLoading}
      pageSizePosition="start"
      pageSizeLabel={`${t("orders.pagination.pageSize", "Số dòng / trang")}:`}
      pageSizeSelectClassName="h-8 w-24"
      pageSizeOptions={ORDERS_PAGE_SIZE_OPTIONS}
      onPageSizeChange={(size) => onPageSizeChange(String(size))}
      onPageChange={(page) => onPageChange(page - 1)}
      summary={
        <span className="min-w-21 text-center text-sm text-muted-foreground">
          {rowsCount === 0
            ? `0 ${t("orders.pagination.transactions", "giao dịch")}`
            : `${ordersPage * ordersPageSize + 1} - ${ordersPage * ordersPageSize + rowsCount} ${t("orders.pagination.of", "trong")} ${ordersTotalCount.toLocaleString("en-US")} ${t("orders.pagination.transactions", "giao dịch")}`}
        </span>
      }
    />
  );
}

/**
 * Điện thoại: 1 hàng gọn `[50 ▾] 1.234 giao dịch   ‹ 1/48 ›`. Ô số dòng dùng select
 * native nhỏ (picker của hệ điều hành) thay cho Select 96px của desktop.
 */
function MobileOrdersPagination({
  page,
  totalPages,
  pageSize,
  totalCount,
  disabled,
  onPageChange,
  onPageSizeChange,
}: {
  /** 0-based như ordersPage. */
  page: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
  disabled: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (value: string) => void;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-1.5 flex shrink-0 items-center gap-2 rounded-lg border border-border bg-muted/20 px-2 py-1">
      <NativeCellSelect
        aria-label={t("orders.pagination.pageSize", "Số dòng / trang")}
        className="w-16 shrink-0 bg-background"
        value={String(pageSize)}
        disabled={disabled}
        onChange={(e) => onPageSizeChange(e.target.value)}
      >
        {ORDERS_PAGE_SIZE_OPTIONS.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </NativeCellSelect>
      <span className="min-w-0 truncate text-xs text-muted-foreground">
        {totalCount.toLocaleString("en-US")} {t("orders.pagination.transactions", "giao dịch")}
      </span>
      <div className="ml-auto flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || page <= 0}
          aria-label={t("orders.mobile.prevPage", "Trang trước")}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="min-w-12 text-center text-xs font-medium tabular-nums">
          {page + 1}/{totalPages}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={disabled || page + 1 >= totalPages}
          aria-label={t("orders.mobile.nextPage", "Trang sau")}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export const OrdersPagination = memo(OrdersPaginationImpl);
