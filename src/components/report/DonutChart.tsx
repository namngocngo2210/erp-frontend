import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { formatNumber } from "@/lib/format";

export type DonutSlice = { name: string; value: number; color: string };

/**
 * Donut chia tỉ trọng: tổng ở tâm, legend kèm giá trị + % của từng lát.
 * Dùng cho dữ liệu "phần của tổng thể" (doanh thu theo kênh, theo SKU).
 */
export function DonutChart({
  slices,
  centerValue,
  centerLabel,
  height = 280,
  formatValue = (v) => formatNumber(v),
}: {
  slices: DonutSlice[];
  centerValue?: string | number;
  centerLabel?: string;
  height?: number;
  formatValue?: (value: number) => string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const share = (value: number) => (total > 0 ? ((value / total) * 100).toFixed(1) : "0.0");

  return (
    <div className="space-y-3">
      <div className="relative">
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="90%"
              strokeWidth={2}
              stroke="var(--card)"
            >
              {slices.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(entry) => {
                    const value = Number(entry.value ?? 0);
                    return `${formatValue(value)} (${share(value)}%)`;
                  }}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>
        {centerValue !== undefined && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-2xl font-bold tabular-nums text-foreground">{centerValue}</div>
            {centerLabel && <div className="text-xs text-muted-foreground">{centerLabel}</div>}
          </div>
        )}
      </div>
      <ul className="grid grid-cols-1 gap-x-4 gap-y-1 text-xs sm:grid-cols-2">
        {slices.map((slice) => (
          <li key={slice.name} className="flex min-w-0 items-center gap-2">
            <span
              aria-hidden
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: slice.color }}
            />
            <span className="truncate text-foreground">{slice.name}</span>
            <span className="ml-auto shrink-0 tabular-nums text-muted-foreground">
              {formatValue(slice.value)} · {share(slice.value)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
