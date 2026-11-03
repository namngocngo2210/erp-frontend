import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/** Một ô số liệu trong lưới đầu hồ sơ. `hint` để giải thích con số nào dễ bị
 * đọc sai (vd. "chi tiêu" chỉ tính đơn giao thành công). */
export function ProfileStat({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card px-4 py-3", className)}>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
