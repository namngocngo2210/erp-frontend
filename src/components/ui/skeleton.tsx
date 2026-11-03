import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Khối giữ chỗ nhấp nháy khi đang tải dữ liệu — thay cho spinner trơ để tránh
 * "màn trắng rồi pop" và layout shift. Chỉ dùng token màu của design system.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-md bg-muted/70", className)}
      {...props}
    />
  );
}

/**
 * Khung xương cho bảng danh sách: một hàng header + N hàng dữ liệu giả, giữ đúng
 * chiều cao để khi dữ liệu thật vào không bị nhảy layout.
 */
function SkeletonTable({
  rows = 8,
  columns = 5,
  className,
  label = "Đang tải",
}: {
  rows?: number;
  columns?: number;
  className?: string;
  /** Nhãn đọc cho trình đọc màn hình (i18n từ nơi gọi). */
  label?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label={label}
      className={cn("w-full overflow-hidden", className)}
    >
      <div className="flex items-center gap-4 border-b border-border bg-muted/30 px-3 py-2.5">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-3.5 flex-1" />
        ))}
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-4 px-3 py-3">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} className="h-4 flex-1" style={{ opacity: 1 - r * (0.5 / rows) }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Lưới thẻ giữ chỗ (dashboard, danh sách card). */
function SkeletonCards({
  count = 3,
  className,
  cardClassName,
}: {
  count?: number;
  className?: string;
  cardClassName?: string;
}) {
  return (
    <div
      role="status"
      aria-busy="true"
      aria-label="Đang tải"
      className={cn("grid gap-3 md:grid-cols-3", className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "space-y-3 rounded-xl border border-border bg-card p-4 shadow-xs",
            cardClassName,
          )}
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-16" />
          </div>
          <Skeleton className="h-2.5 w-full" />
          <Skeleton className="h-2.5 w-4/5" />
          <Skeleton className="h-2.5 w-2/3" />
        </div>
      ))}
    </div>
  );
}

export { Skeleton, SkeletonTable, SkeletonCards };
