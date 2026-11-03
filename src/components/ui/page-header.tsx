import * as React from "react";

import { cn } from "@/lib/utils";

interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  /** Tiêu đề trang. */
  title: React.ReactNode;
  /** Mô tả ngắn dưới tiêu đề (tùy chọn). */
  description?: React.ReactNode;
  /** Nút/hành động canh phải (tùy chọn). */
  actions?: React.ReactNode;
}

/**
 * Header trang thống nhất: tiêu đề + mô tả + vùng hành động canh phải.
 * Gom typography/spacing về một chỗ để 20+ trang không mỗi nơi một kiểu.
 * Responsive: hành động xuống dòng dưới tiêu đề trên màn hẹp.
 */
const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ title, description, actions, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    >
      <div className="min-w-0 space-y-1">
        <h2 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {/* min-w-0 (không shrink-0): vùng hành động phải co được thì flex-wrap mới
          xuống dòng; shrink-0 làm cả hàng nút tràn rộng hơn nội dung trang. */}
      {actions ? (
        <div className="flex min-w-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      ) : null}
    </div>
  ),
);
PageHeader.displayName = "PageHeader";

export { PageHeader };
