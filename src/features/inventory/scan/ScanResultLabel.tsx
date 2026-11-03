import { AlertTriangle, Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ScanResultTone = "ok" | "warn" | "error";

const TONE: Record<ScanResultTone, { icon: typeof Check; cls: string }> = {
  ok: { icon: Check, cls: "text-action-success" },
  warn: { icon: AlertTriangle, cls: "text-action-warning" },
  error: { icon: X, cls: "text-action-danger" },
};

/** Kết quả 1 dòng quét kho: icon (✓ / ⚠ / ✗) + câu, màu theo token trạng thái. */
export function ScanResultLabel({
  tone,
  children,
  className,
}: {
  tone: ScanResultTone;
  children: React.ReactNode;
  className?: string;
}) {
  const { icon: Icon, cls } = TONE[tone];
  return (
    <span className={cn("inline-flex items-center gap-1", cls, className)}>
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      <span>{children}</span>
    </span>
  );
}
