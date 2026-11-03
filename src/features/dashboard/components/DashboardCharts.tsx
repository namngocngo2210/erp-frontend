import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { formatRevenueShort, safePercent } from "@/lib/metrics";

import { BOMB_REASON_PALETTE, CHART_COLORS, PERCENT_AXIS_DOMAIN } from "../dashboard-constants";
import {
  closeRateDenominator,
  formatCurrency,
  reachable,
  resolveDisplayName,
} from "../dashboard-utils";
import type {
  BombReasonRow,
  DeliveryChartRow,
  DistributionSlice,
  SalePerformanceRow,
} from "../types";
import { ChartTooltip } from "./DashboardPrimitives";
import { formatNumber } from "@/lib/format";

export function CloseRateChart({
  rows,
  fallback,
  labels,
}: {
  rows: SalePerformanceRow[];
  fallback: string;
  labels: { rate: string };
}) {
  const data = [...rows]
    .map((row) => {
      // Mẫu số "% chốt" loại Khách bị bệnh nền + Khách muốn đến cửa hàng —
      // đồng bộ với CloseRateSection.
      const denom = closeRateDenominator(row);
      return {
        name: resolveDisplayName(row, fallback),
        value: safePercent(row.closed, denom),
        total: denom,
        closed: row.closed,
      };
    })
    .sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 44 + 80)}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={0.55}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={PERCENT_AXIS_DOMAIN}
          unit="%"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(entry) => {
                const payload = entry.payload as { closed?: number; total?: number } | undefined;
                const closed = payload?.closed ?? 0;
                const total = payload?.total ?? 0;
                return `${entry.value}% (${formatNumber(closed)} / ${formatNumber(total)})`;
              }}
            />
          }
        />
        <Bar dataKey="value" name={labels.rate} radius={[4, 4, 0, 0]}>
          {data.map((row) => (
            <Cell
              key={row.name}
              fill={
                row.value >= 80
                  ? CHART_COLORS.green
                  : row.value >= 60
                    ? CHART_COLORS.amber
                    : CHART_COLORS.red
              }
            />
          ))}
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => `${Number(v ?? 0).toFixed(1)}%`}
            style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function SaleCapacityChart({
  rows,
  fallback,
  labels,
}: {
  rows: SalePerformanceRow[];
  fallback: string;
  labels: { closed: string; refusal: string };
}) {
  const data = rows.map((row) => {
    const denom = reachable(row);
    return {
      name: resolveDisplayName(row, fallback),
      closed: safePercent(row.closed, denom),
      refusal: safePercent(row.not_buying, denom),
    };
  });
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={0.55}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={PERCENT_AXIS_DOMAIN}
          unit="%"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip formatter={(entry) => `${entry.value}%`} />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconType="circle" iconSize={8} />
        <Bar
          dataKey="closed"
          name={labels.closed}
          fill={CHART_COLORS.green}
          radius={[4, 4, 0, 0]}
        />
        <Bar
          dataKey="refusal"
          name={labels.refusal}
          fill={CHART_COLORS.red}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RevenueChart({
  rows,
  fallback,
  labels,
}: {
  rows: SalePerformanceRow[];
  fallback: string;
  labels: { revenue: string };
}) {
  const data = [...rows]
    .map((row) => ({
      name: resolveDisplayName(row, fallback),
      value: Number(row.revenue || 0),
      delivered: row.delivered_count ?? 0,
    }))
    .sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, data.length * 44 + 80)}>
      <BarChart data={data} margin={{ top: 24, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={0.55}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatRevenueShort}
        />
        <Tooltip
          content={
            <ChartTooltip
              formatter={(entry) => {
                const payload = entry.payload as { delivered?: number } | undefined;
                const delivered = payload?.delivered ?? 0;
                return `${formatCurrency(Number(entry.value))} · ${formatNumber(delivered)} đơn`;
              }}
            />
          }
        />
        <Bar dataKey="value" name={labels.revenue} fill={CHART_COLORS.purple} radius={[4, 4, 0, 0]}>
          <LabelList
            dataKey="value"
            position="top"
            formatter={(v) => formatRevenueShort(Number(v ?? 0))}
            style={{ fontSize: 11, fill: "var(--foreground)", fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DeliveryQualityChart({
  rows,
  labels,
}: {
  rows: DeliveryChartRow[];
  labels: { bomb: string; delivered: string; pending: string };
}) {
  const sorted = [...rows].sort(
    (a, b) => b.delivered + b.bomb + b.pending - (a.delivered + a.bomb + a.pending),
  );
  return (
    <ResponsiveContainer width="100%" height={Math.max(280, sorted.length * 44 + 80)}>
      <BarChart data={sorted} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={0.55}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          content={<ChartTooltip formatter={(entry) => formatNumber(Number(entry.value ?? 0))} />}
        />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 6 }} iconType="circle" iconSize={8} />
        <Bar dataKey="delivered" name={labels.delivered} stackId="a" fill={CHART_COLORS.green} />
        <Bar dataKey="bomb" name={labels.bomb} stackId="a" fill={CHART_COLORS.red} />
        <Bar
          dataKey="pending"
          name={labels.pending}
          stackId="a"
          fill={CHART_COLORS.amber}
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DistributionDonut({
  data,
  centerLabel,
  centerValue,
  formatValue = (v) => formatNumber(v),
}: {
  data: DistributionSlice[];
  centerLabel?: string;
  centerValue?: string | number;
  formatValue?: (value: number) => string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  return (
    <div className="space-y-2">
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius="60%"
              outerRadius="90%"
              strokeWidth={2}
              stroke="var(--card)"
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
            <Tooltip
              content={
                <ChartTooltip
                  formatter={(entry) => {
                    const v = Number(entry.value ?? 0);
                    const pct = total > 0 ? ((v / total) * 100).toFixed(1) : "0.0";
                    return `${formatValue(v)} (${pct}%)`;
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
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {data.map((slice) => {
          const pct = total > 0 ? ((slice.value / total) * 100).toFixed(1) : "0.0";
          return (
            <li key={slice.name} className="flex items-center gap-2 min-w-0">
              <span
                aria-hidden
                className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
                style={{ backgroundColor: slice.color }}
              />
              <span className="truncate text-foreground">{slice.name}</span>
              <span className="ml-auto tabular-nums text-muted-foreground">
                {formatValue(slice.value)} · {pct}%
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function VerticalRateBar({
  data,
  unit = "%",
  warningThreshold,
  domain,
}: {
  data: { name: string; value: number; color?: string }[];
  unit?: string;
  warningThreshold?: number;
  domain?: [number, number];
}) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={sorted} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={0.55}
          vertical={false}
        />
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          unit={unit}
          domain={domain}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip content={<ChartTooltip formatter={(entry) => `${entry.value}${unit}`} />} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
          {sorted.map((row) => (
            <Cell
              key={row.name}
              fill={
                row.color ??
                (warningThreshold !== undefined && row.value > warningThreshold
                  ? CHART_COLORS.red
                  : CHART_COLORS.amber)
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BombReasonsChart({ reasons, total }: { reasons: BombReasonRow[]; total: number }) {
  const radius = 70;
  const stroke = 28;
  const center = radius + stroke / 2;
  const size = (radius + stroke / 2) * 2;
  const circumference = 2 * Math.PI * radius;

  // Tính thuần (không gán lại biến sau render — React Compiler yêu cầu):
  // offset của mỗi segment = tổng chiều dài các segment đứng trước.
  const lengths = reasons.map((row) => (total > 0 ? row.count / total : 0) * circumference);
  const segments = reasons.map((row, idx) => {
    const fraction = total > 0 ? row.count / total : 0;
    const length = lengths[idx];
    const offsetBefore = lengths.slice(0, idx).reduce((sum, l) => sum + l, 0);
    return {
      key: row.assessment__bomb_reason_type_code ?? `__null_${idx}`,
      label: row.label,
      count: row.count,
      pct: fraction * 100,
      color: BOMB_REASON_PALETTE[idx % BOMB_REASON_PALETTE.length],
      dasharray: `${length} ${circumference - length}`,
      dashoffset: -offsetBefore,
    };
  });

  return (
    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        {segments.map((seg) => (
          <circle
            key={seg.key}
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={seg.color}
            strokeWidth={stroke}
            strokeDasharray={seg.dasharray}
            strokeDashoffset={seg.dashoffset}
            transform={`rotate(-90 ${center} ${center})`}
          />
        ))}
        <text
          x={center}
          y={center - 4}
          textAnchor="middle"
          className="fill-foreground text-sm font-semibold"
        >
          {total}
        </text>
        <text
          x={center}
          y={center + 14}
          textAnchor="middle"
          className="fill-muted-foreground text-xs"
        >
          đơn hoàn
        </text>
      </svg>
      <ul className="flex-1 space-y-1.5 text-sm">
        {segments.map((seg) => (
          <li key={seg.key} className="flex items-center gap-3">
            <span
              aria-hidden
              className="inline-block h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: seg.color }}
            />
            <span className="flex-1 text-foreground">{seg.label}</span>
            <span className="tabular-nums text-muted-foreground">
              {seg.count} ({seg.pct.toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
