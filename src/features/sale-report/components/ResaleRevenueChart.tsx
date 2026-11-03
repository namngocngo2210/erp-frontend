import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  XAxis,
  YAxis,
} from "recharts";

import { ChartTooltip } from "@/features/dashboard/components/DashboardPrimitives";
import { CHART_COLORS } from "@/features/dashboard/dashboard-constants";
import { formatRevenueShort } from "@/lib/metrics";

import { type ResaleStaffRow } from "../resale-selectors";

type ResaleRevenueChartProps = {
  rows: ResaleStaffRow[];
  /** Nhãn series, hiện trong tooltip. */
  seriesName: string;
};

type ResaleTooltipContentProps = Partial<Omit<TooltipContentProps<number, string>, "formatter">> & {
  labelByKey: Map<string, string>;
};

/**
 * Dịch `label` (dataKey `key` của trục Y, không phải tên hiển thị) sang
 * `display_name` trước khi giao cho `ChartTooltip` chung. Bọc thành component
 * và truyền vào `<Tooltip content={...} />` dưới dạng ELEMENT (không phải hàm)
 * — recharts `cloneElement` các prop nó tự tính (`active`/`payload`/`label`)
 * lên trên props có sẵn của element, còn `labelByKey` không trùng key nên
 * sống sót qua lượt clone đó.
 */
function ResaleTooltipContent({ labelByKey, label, ...rest }: ResaleTooltipContentProps) {
  const mappedLabel = typeof label === "string" ? (labelByKey.get(label) ?? label) : label;
  return (
    <ChartTooltip
      {...rest}
      label={mappedLabel}
      formatter={(entry) => formatRevenueShort(Number(entry.value ?? 0))}
    />
  );
}

/**
 * Bar NGANG xếp hạng doanh thu resale theo nhân viên. Chỉ vẽ — dữ liệu đã được
 * `buildResaleRows` sắp giảm dần từ trước.
 *
 * Nhân viên có doanh thu resale 0 bị lọc khỏi CHART (thanh dài 0 chỉ tốn chiều
 * cao) nhưng VẪN nằm trong bảng bên dưới, nơi số 0 là thông tin có ích.
 */
export function ResaleRevenueChart({ rows, seriesName }: ResaleRevenueChartProps) {
  // `key` (không phải `label`) là dataKey của trục Y: hai nhân viên trùng
  // display_name không được phép gộp thành một hạng mục trên chart. Nhãn
  // người-đọc lấy lại qua `labelByKey` ở tickFormatter (trục) và trong
  // content của Tooltip (không dùng labelFormatter — recharts không áp nó
  // khi Tooltip nhận `content` là component tuỳ biến).
  const data = rows
    .filter((row) => row.deliveredRevenue > 0)
    .map((row) => ({ key: row.key, name: row.label, value: row.deliveredRevenue }));
  const labelByKey = new Map(data.map((row) => [row.key, row.name]));

  if (data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, data.length * 40 + 72)}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 8 }}>
        <CartesianGrid
          strokeDasharray="2 4"
          stroke="var(--border)"
          strokeOpacity={0.55}
          horizontal={false}
        />
        <XAxis
          type="number"
          tickFormatter={formatRevenueShort}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="key"
          tickFormatter={(key: string) => labelByKey.get(key) ?? key}
          width={150}
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          stroke="var(--border)"
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--muted)", fillOpacity: 0.4 }}
          content={<ResaleTooltipContent labelByKey={labelByKey} />}
        />
        <Bar dataKey="value" name={seriesName} fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={(value) => formatRevenueShort(Number(value ?? 0))}
            className="fill-muted-foreground text-xs"
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
