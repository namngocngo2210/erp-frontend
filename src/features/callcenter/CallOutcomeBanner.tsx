import { PhoneMissed, RotateCcw, X } from "lucide-react";

import { Button } from "@/components/ui/button";

import type { LastCallOutcome } from "./webphone-context";

/** Kết quả cuộc gọi vừa rồi (bận / từ chối / không bắt máy / nhỡ) + Gọi lại. */
export function CallOutcomeBanner({
  value,
  onRedial,
  onDismiss,
}: {
  value: LastCallOutcome;
  onRedial: (phone: string) => void;
  onDismiss: () => void;
}) {
  const error = value.outcome.tone === "error";
  return (
    <div
      role="status"
      className={`flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm ${
        error
          ? "border-destructive/40 bg-destructive/10 text-destructive"
          : "border-action-warning/30 bg-action-warning/10 text-action-warning"
      }`}
    >
      <PhoneMissed className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-medium">{value.outcome.title}</div>
        <div className="text-xs opacity-80">
          <span className="font-mono">{value.phone}</span>
          {value.outcome.detail && value.outcome.detail !== value.outcome.title ? (
            <> · {value.outcome.detail}</>
          ) : null}
        </div>
        {value.phone ? (
          <Button
            size="sm"
            variant="outline"
            className="mt-1.5 h-7 gap-1 px-2 text-xs"
            onClick={() => onRedial(value.phone)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Gọi lại
          </Button>
        ) : null}
      </div>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={onDismiss}
        aria-label="Đóng kết quả cuộc gọi"
        title="Đóng"
      >
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
