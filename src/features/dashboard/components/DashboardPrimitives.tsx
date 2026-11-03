import { type ReactNode } from "react";
import { ChevronRight, Target, TrendingUp, Trophy } from "lucide-react";
import { type TooltipContentProps } from "recharts";

import type { KpiBreakdownItem, KpiTone, PodiumEntry, TooltipEntry } from "../types";

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

export function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: Partial<Omit<TooltipContentProps<number, string>, "formatter">> & {
  formatter?: (entry: TooltipEntry) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-xs shadow-md">
      {label !== undefined && (
        <div className="mb-1 font-medium text-popover-foreground">{label}</div>
      )}
      <ul className="space-y-0.5">
        {payload.map((entry, idx) => (
          <li key={`${entry.dataKey ?? idx}`} className="flex items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: entry.color ?? undefined }}
            />
            <span className="flex-1 text-muted-foreground">{entry.name}</span>
            <span className="tabular-nums font-medium text-popover-foreground">
              {formatter ? formatter(entry as TooltipEntry) : String(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const TONE_TEXT_CLASS: Record<KpiTone, string> = {
  default: "text-foreground",
  success: "text-action-success",
  danger: "text-action-danger",
  warning: "text-action-warning",
  muted: "text-muted-foreground",
};

export function KpiHero({
  bigValue,
  bigLabel,
  bigTone = "success",
  formula,
  breakdown,
}: {
  bigValue: string;
  bigLabel: string;
  bigTone?: KpiTone;
  formula?: string;
  breakdown: KpiBreakdownItem[];
}) {
  return (
    <div className="grid grid-cols-1 gap-4 rounded-xl border border-border bg-muted/20 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-6">
      <div className="min-w-0 space-y-3">
        {formula && (
          // pre-wrap: công thức dài xuống dòng thay vì ép grid rộng theo nó (vỡ ở mobile).
          <pre className="whitespace-pre-wrap break-words rounded-md border border-border/60 bg-background/60 px-3 py-2 font-mono text-xs leading-relaxed text-muted-foreground">
            {formula}
          </pre>
        )}
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {breakdown.map((item) => (
            <div key={item.label} className="space-y-0.5">
              <div
                className={`text-xl font-semibold tabular-nums ${TONE_TEXT_CLASS[item.tone ?? "default"]}`}
              >
                {item.value}
              </div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="text-center md:text-right">
        <div className={`text-5xl font-bold tabular-nums ${TONE_TEXT_CLASS[bigTone]}`}>
          {bigValue}
        </div>
        <div className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{bigLabel}</div>
      </div>
    </div>
  );
}

const PODIUM_ICON: Record<PodiumEntry["badgeIcon"], typeof Trophy> = {
  trophy: Trophy,
  target: Target,
  trending: TrendingUp,
};

const PODIUM_BAR_TONE_CLASS: Record<KpiTone, string> = {
  default: "bg-blue-500",
  success: "bg-action-success",
  danger: "bg-action-danger",
  warning: "bg-action-warning",
  muted: "bg-slate-400",
};

export function KpiPodiumCards({ entries }: { entries: PodiumEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      {entries.map((entry) => {
        const Icon = PODIUM_ICON[entry.badgeIcon];
        return (
          <div
            key={entry.key}
            className="min-w-0 space-y-3 rounded-xl border border-border bg-muted/20 p-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="text-base font-semibold text-foreground truncate">
                  {entry.title}
                </div>
                <div className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/60 px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  <Icon className="h-3 w-3" />
                  {entry.badge}
                </div>
              </div>
              <div
                className={`text-3xl font-bold tabular-nums shrink-0 ${TONE_TEXT_CLASS[entry.bigTone ?? "success"]}`}
              >
                {entry.bigValue}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {entry.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="min-w-0 rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5"
                >
                  <div
                    className={`text-base font-semibold tabular-nums ${TONE_TEXT_CLASS[stat.tone ?? "default"]}`}
                  >
                    {stat.value}
                  </div>
                  <div className="break-words text-xs uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-1.5">
              {entry.bars.map((bar) => (
                <div key={bar.label} className="space-y-0.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{bar.label}</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {bar.value.toFixed(1)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full transition-[width] duration-700 ease-out ${PODIUM_BAR_TONE_CLASS[bar.tone]}`}
                      style={{ width: `${Math.max(0, Math.min(100, bar.value))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {entry.subtitle && (
              <div className="rounded-md border border-border/60 bg-background/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                {entry.subtitle}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
