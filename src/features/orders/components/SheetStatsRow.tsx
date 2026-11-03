import { formatNumber } from "@/lib/format";
export type StatItem = {
  key: string;
  label: string;
  value: number;
  tone?: "danger" | "warn" | "ok" | "info";
  active?: boolean;
};

const TONE: Record<string, string> = {
  danger: "text-action-danger",
  warn: "text-action-warning",
  ok: "text-action-success",
  info: "text-action-info",
};

/** Hàng thống kê click-to-filter, dùng cho cả Sheet 1/2 và Sheet 3. */
export function SheetStatsRow({
  items,
  onPick,
}: {
  items: StatItem[];
  onPick?: (key: string) => void;
}) {
  return (
    <div className="mb-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onPick?.(it.key)}
          className={`flex-1 rounded-lg border bg-card px-3.5 py-2.5 text-left transition-colors hover:bg-accent ${
            it.active
              ? "border-primary ring-1 ring-primary"
              : it.tone === "danger"
                ? "border-action-danger/30"
                : "border-border"
          }`}
        >
          <div className="text-xs text-muted-foreground">{it.label}</div>
          <div className={`text-xl font-bold ${it.tone ? TONE[it.tone] : "text-foreground"}`}>
            {formatNumber(it.value)}
          </div>
        </button>
      ))}
    </div>
  );
}
