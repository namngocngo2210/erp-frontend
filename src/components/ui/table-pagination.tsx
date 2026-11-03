import type { ReactNode } from "react";

import { PaginationPages } from "@/components/ui/pagination";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type TablePaginationProps = {
  /** Tổng số DÒNG (không phải số trang). */
  total: number;
  pageSize: number;
  /** Trang hiện tại, 1-based. Dùng cặp page/onPageChange HOẶC offset/onOffsetChange. */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Vị trí dòng đầu trang (0-based) — cho trang phân theo limit/offset. */
  offset?: number;
  onOffsetChange?: (offset: number) => void;
  /** Ghi đè tổng số trang khi caller có logic riêng (vd. has_next nới thêm 1 trang). */
  totalPages?: number;
  /** Truyền cùng onPageSizeChange mới hiện ô chọn số dòng/trang. KHÔNG unify giá trị giữa các trang — options là quyết định UX riêng của từng feature, export hằng từ feature rồi truyền vào. */
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
  pageSizeLabel?: ReactNode;
  pageSizeSelectClassName?: string;
  /** "start": select bên trái, summary + nút trang bên phải (kiểu trang Đơn hàng). */
  pageSizePosition?: "start" | "end";
  /**
   * Text đếm bên trái. Bỏ qua → mặc định "X–Y / total"; truyền `null` → ẩn hẳn
   * (khi trang tự render phần đếm ở chỗ khác).
   */
  summary?: ReactNode;
  disabled?: boolean;
  className?: string;
};

/**
 * Thanh phân trang dùng chung cho bảng: "[summary] · Mỗi trang [select] · [pages]".
 * Gom 5 bản chép tay ở orders/customers/inventory/contacts/channels về một chỗ;
 * phần dựng dãy nút số trang vẫn là {@link PaginationPages}.
 */
export function TablePagination({
  total,
  pageSize,
  page,
  onPageChange,
  offset,
  onOffsetChange,
  totalPages,
  pageSizeOptions,
  onPageSizeChange,
  pageSizeLabel = "Mỗi trang",
  pageSizeSelectClassName = "w-[90px]",
  pageSizePosition = "end",
  summary,
  disabled = false,
  className,
}: TablePaginationProps) {
  const safePageSize = Math.max(1, pageSize);
  const currentPage = page ?? Math.floor((offset ?? 0) / safePageSize) + 1;
  const pageCount = Math.max(1, totalPages ?? Math.ceil(total / safePageSize));

  const handlePageChange = (next: number) => {
    onPageChange?.(next);
    onOffsetChange?.((next - 1) * safePageSize);
  };

  const start = offset ?? (currentPage - 1) * safePageSize;
  const summaryNode =
    summary === undefined ? (
      <span className="text-sm text-muted-foreground">
        {start + 1}–{Math.min(start + pageSize, total)} / {total}
      </span>
    ) : (
      summary
    );

  const sizeSelect =
    pageSizeOptions && onPageSizeChange ? (
      <>
        <span className="text-sm text-muted-foreground">{pageSizeLabel}</span>
        <Select
          value={String(pageSize)}
          onValueChange={(value) => {
            const next = Number(value);
            if (Number.isFinite(next) && next > 0) onPageSizeChange(next);
          }}
        >
          <SelectTrigger className={pageSizeSelectClassName}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </>
    ) : null;

  const pagesNode = (
    <PaginationPages
      page={currentPage}
      totalPages={pageCount}
      disabled={disabled}
      onPageChange={handlePageChange}
    />
  );

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2",
        summaryNode !== null && "justify-between",
        className,
      )}
    >
      {pageSizePosition === "start" ? (
        <>
          <div className="flex items-center gap-2">{sizeSelect}</div>
          <div className="flex flex-wrap items-center gap-2">
            {summaryNode}
            {pagesNode}
          </div>
        </>
      ) : (
        <>
          {summaryNode}
          <div className="flex flex-wrap items-center gap-2">
            {sizeSelect}
            {pagesNode}
          </div>
        </>
      )}
    </div>
  );
}
