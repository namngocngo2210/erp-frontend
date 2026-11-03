import { type ReactNode } from "react";
import { ChevronRight } from "lucide-react";

/** Khối "Xem bảng chi tiết" bung/thu bằng <details> — chart ở trên, bảng ở đây. */
export function CollapsibleTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="group mt-4 rounded-lg border border-border/60 bg-muted/20">
      <summary className="flex cursor-pointer select-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronRight className="h-3.5 w-3.5 transition-transform group-open:rotate-90" />
        {label}
      </summary>
      <div className="overflow-x-auto px-3 pb-3">{children}</div>
    </details>
  );
}
