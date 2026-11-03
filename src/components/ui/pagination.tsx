import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PageItem = number | "ellipsis";

/**
 * Dựng dãy nút số trang dạng: 1 … (p-1) p (p+1) … cuối.
 * - `page`/`totalPages` là 1-based; luôn giữ trang đầu + trang cuối.
 * - Quanh trang hiện tại giữ `siblingCount` trang mỗi bên; khe hở > 1 trang
 *   mới thay bằng "ellipsis" (khe đúng 1 trang thì hiện luôn số cho đỡ nhảy).
 */
export function buildPageItems(page: number, totalPages: number, siblingCount = 1): PageItem[] {
  const total = Math.max(1, Math.trunc(totalPages));
  const current = Math.min(Math.max(1, Math.trunc(page)), total);

  // Đủ ngắn thì hiện tất: 2 đầu mút + hiện tại + sibling 2 bên + 2 ô ellipsis.
  const maxVisible = siblingCount * 2 + 5;
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: PageItem[] = [1];
  const left = Math.max(2, current - siblingCount);
  const right = Math.min(total - 1, current + siblingCount);

  if (left > 2) items.push(left === 3 ? 2 : "ellipsis");
  for (let p = left; p <= right; p += 1) items.push(p);
  if (right < total - 1) items.push(right === total - 2 ? total - 1 : "ellipsis");

  items.push(total);
  return items;
}

type PaginationPagesProps = {
  /** Trang hiện tại, 1-based. */
  page: number;
  /** Tổng số trang (>= 1). */
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  siblingCount?: number;
  className?: string;
};

/**
 * Dãy phân trang dạng số: ‹ 1 … 4 5 6 … 20 ›.
 * Chỉ lo phần chuyển trang; select số dòng/trang và text đếm do trang tự render.
 */
export function PaginationPages({
  page,
  totalPages,
  onPageChange,
  disabled = false,
  siblingCount = 1,
  className,
}: PaginationPagesProps) {
  const total = Math.max(1, totalPages);
  const current = Math.min(Math.max(1, page), total);
  const items = buildPageItems(current, total, siblingCount);

  return (
    <nav aria-label="Phân trang" className={cn("flex items-center gap-1", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Trang trước"
        disabled={disabled || current <= 1}
        onClick={() => onPageChange(current - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      {items.map((item, index) =>
        item === "ellipsis" ? (
          <span
            key={`ellipsis-${index}`}
            aria-hidden
            className="flex size-8 items-end justify-center pb-1 text-sm text-muted-foreground"
          >
            …
          </span>
        ) : (
          <Button
            key={item}
            type="button"
            variant={item === current ? "default" : "outline"}
            size="icon"
            aria-label={`Trang ${item}`}
            aria-current={item === current ? "page" : undefined}
            disabled={disabled}
            onClick={() => {
              if (item !== current) onPageChange(item);
            }}
          >
            {item}
          </Button>
        ),
      )}
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Trang sau"
        disabled={disabled || current >= total}
        onClick={() => onPageChange(current + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </nav>
  );
}
