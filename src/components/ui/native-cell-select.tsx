import * as React from "react";

import { cn } from "@/lib/utils";

type NativeCellSelectProps = React.ComponentProps<"select"> & {
  /**
   * `outline` (mặc định): viền + nền trong suốt. `filled`: không viền, chữ đậm — nền do
   * nơi gọi tô (vd màu theo kênh qua `style`).
   */
  variant?: "outline" | "filled";
};

/**
 * `<select>` native cho ô bảng dày (OrdersTable, bảng bảo hành… hàng trăm dòng): giữ
 * native vì nhẹ và mở picker hệ thống trên mobile, nhưng dùng chung một bộ class —
 * cao 32px (40px trên màn cảm ứng), vòng focus theo token `ring`. Độ rộng tối thiểu
 * của cột truyền qua `className` (giữ px để cột bảng không co theo root font).
 */
export function NativeCellSelect({
  className,
  variant = "outline",
  ...props
}: NativeCellSelectProps) {
  return (
    <select
      data-slot="native-cell-select"
      className={cn(
        "w-full cursor-pointer rounded px-1.5 text-xs focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-default disabled:opacity-60",
        !props.multiple && "h-8 pointer-coarse:h-10",
        variant === "outline" ? "border border-border bg-transparent" : "border-0 font-medium",
        className,
      )}
      {...props}
    />
  );
}
