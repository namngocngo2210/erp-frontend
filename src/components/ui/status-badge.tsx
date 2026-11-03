import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Nhãn trạng thái theo NGHĨA (thành công / cảnh báo / lỗi / thông tin / trung tính)
 * dùng token `action-*` — không dùng màu palette thô (emerald/amber/red…).
 * Màu phân loại (hãng vận chuyển, trạng thái đơn, accent module) KHÔNG đi qua đây.
 */
const statusBadgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        success: "border-action-success/30 bg-action-success/10 text-action-success",
        warning: "border-action-warning/30 bg-action-warning/10 text-action-warning",
        danger: "border-action-danger/30 bg-action-danger/10 text-action-danger",
        info: "border-action-info/30 bg-action-info/10 text-action-info",
        neutral: "border-border bg-muted text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

type StatusTone = NonNullable<VariantProps<typeof statusBadgeVariants>["tone"]>;

interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusBadgeVariants> {}

function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone ?? "neutral"}
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    />
  );
}

export { StatusBadge, statusBadgeVariants, type StatusTone };
