import {
  type DailyBreakdownRow,
  formatMonthLabel,
  groupDailyRowsByMonth,
  sumCostByChannel,
} from "./report-grouping";

export type ChannelRevenueRow = {
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
  closed_orders: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
};

export type TopProductChannelRow = {
  channel_id: number | null;
  channel__code: string | null;
  channel__name: string | null;
  closed_orders: number;
  quantity: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
};

export type TopProductRow = {
  product_id: number | null;
  product__name: string | null;
  product__sku: string | null;
  closed_orders: number;
  quantity: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
  channels: TopProductChannelRow[];
};

export type ProvinceRevenueRow = {
  province: string | null;
  closed_orders: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
};

export type GenderRevenueRow = {
  gender: 0 | 1 | null;
  closed_orders: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
};

export type AdsReportPayload = {
  revenue_by_channel: ChannelRevenueRow[];
  top_products: TopProductRow[];
  daily_breakdown: DailyBreakdownRow[];
  /**
   * Chi phí ads đã quy được về một sản phẩm. Rổ "Chưa gán chiến dịch" = tổng chi phí
   * của bảng TRỪ số này — làm bằng phép trừ để hai vế luôn khớp tổng (backend giải
   * thích lý do ở summary_ads_assigned_cost).
   */
  assigned_ads_cost?: string;
  revenue_by_province: ProvinceRevenueRow[];
  revenue_by_gender: GenderRevenueRow[];
};

export type AdsKpis = {
  totalRevenue: number;
  totalCost: number;
  ratioPct: number | null;
  closedOrders: number;
  deliveredOrders: number;
  deliveredRevenue: number;
};

export type ChannelRevenueDatum = {
  name: string;
  revenue: number;
  closedOrders: number;
  ratioPct: number | null;
};

export type TrendDatum = {
  label: string;
  revenue: number;
  cost: number;
  ratioPct: number | null;
};

export type TopProductDatum = {
  name: string;
  revenue: number;
  closedOrders: number;
};

function ratioPct(revenue: number, cost: number): number | null {
  return revenue > 0 ? (cost / revenue) * 100 : null;
}

function channelName(row: { channel__name: string | null; channel__code: string | null }): string {
  return row.channel__name || row.channel__code || "—";
}

/**
 * Tổng KPI đầu trang. `totalCost` cộng chi phí của các kênh CÓ trong
 * `channelRows` để khớp đúng dòng "Tổng" của bảng chi tiết; backend đã
 * zero-fill mọi kênh trong scope (kể cả kênh 0 đơn chốt nhưng có chi phí)
 * nên tổng này cũng khớp với khối "Diễn biến doanh thu / chi phí".
 */
export function computeAdsKpis(
  channelRows: readonly ChannelRevenueRow[],
  dailyRows: readonly DailyBreakdownRow[],
): AdsKpis {
  const costByChannel = sumCostByChannel(dailyRows);
  let totalRevenue = 0;
  let totalCost = 0;
  let closedOrders = 0;
  let deliveredOrders = 0;
  let deliveredRevenue = 0;
  for (const row of channelRows) {
    totalRevenue += Number(row.revenue || 0);
    totalCost += row.channel_id != null ? (costByChannel.get(row.channel_id) ?? 0) : 0;
    closedOrders += row.closed_orders || 0;
    deliveredOrders += row.delivered_orders || 0;
    deliveredRevenue += Number(row.delivered_revenue || 0);
  }
  return {
    totalRevenue,
    totalCost,
    ratioPct: ratioPct(totalRevenue, totalCost),
    closedOrders,
    deliveredOrders,
    deliveredRevenue,
  };
}

export function buildChannelRevenueChartData(
  channelRows: readonly ChannelRevenueRow[],
  dailyRows: readonly DailyBreakdownRow[],
): ChannelRevenueDatum[] {
  const costByChannel = sumCostByChannel(dailyRows);
  return channelRows
    .map((row) => {
      const revenue = Number(row.revenue || 0);
      const cost = row.channel_id != null ? (costByChannel.get(row.channel_id) ?? 0) : 0;
      return {
        name: channelName(row),
        revenue,
        closedOrders: row.closed_orders || 0,
        ratioPct: ratioPct(revenue, cost),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}

export function buildDailyTrendChartData(
  dailyRows: readonly DailyBreakdownRow[],
  groupByMonth: boolean,
): TrendDatum[] {
  if (groupByMonth) {
    return groupDailyRowsByMonth(dailyRows).map((m) => ({
      label: formatMonthLabel(m.month),
      revenue: m.revenue,
      cost: m.cost,
      ratioPct: m.ratio_pct,
    }));
  }
  return dailyRows.map((row) => ({
    label: row.date,
    revenue: Number(row.revenue || 0),
    cost: Number(row.cost || 0),
    ratioPct: row.ratio_pct,
  }));
}

export function buildTopProductsChartData(
  topProducts: readonly TopProductRow[],
  limit: number,
): TopProductDatum[] {
  return topProducts.slice(0, limit).map((p) => ({
    name: p.product__sku || p.product__name || "—",
    revenue: Number(p.revenue || 0),
    closedOrders: p.closed_orders || 0,
  }));
}

export type ChannelStackChart = {
  data: Array<Record<string, string | number>>;
  series: { key: string; name: string }[];
};

/** Doanh thu theo kênh × thời gian, dạng stacked bar: mỗi kênh là một series `ch_<id>`. */
export function buildChannelStackChartData(
  dailyRows: readonly DailyBreakdownRow[],
  groupByMonth: boolean,
): ChannelStackChart {
  const names = new Map<number, string>();
  const buckets = new Map<string, Map<number, number>>();
  for (const row of dailyRows) {
    const label = groupByMonth ? formatMonthLabel(row.date.slice(0, 7)) : row.date;
    const bucket = buckets.get(label) ?? new Map<number, number>();
    for (const ch of row.channels) {
      if (ch.channel_id == null) continue;
      names.set(ch.channel_id, ch.channel__name || ch.channel__code || `#${ch.channel_id}`);
      bucket.set(ch.channel_id, (bucket.get(ch.channel_id) ?? 0) + Number(ch.revenue || 0));
    }
    buckets.set(label, bucket);
  }
  const series = Array.from(names, ([id, name]) => ({ key: `ch_${id}`, name }));
  const data = Array.from(buckets, ([label, bucket]) => {
    const entry: Record<string, string | number> = { label };
    for (const [id, revenue] of bucket) entry[`ch_${id}`] = revenue;
    for (const s of series) if (!(s.key in entry)) entry[s.key] = 0;
    return entry;
  });
  return { data, series };
}

/** Dòng phân bổ đơn chốt/doanh thu đã gắn nhãn hiển thị (tỉnh/thành, giới tính). */
export type BreakdownRevenueRow = {
  label: string;
  closed_orders: number;
  revenue: string;
  delivered_orders: number;
  delivered_revenue: string;
};

/** Map rows theo tỉnh/thành sang shape chung; province null → `unknownLabel`. */
export function buildProvinceBreakdownRows(
  rows: readonly ProvinceRevenueRow[],
  unknownLabel: string,
): BreakdownRevenueRow[] {
  return rows.map(({ province, ...rest }) => ({ label: province || unknownLabel, ...rest }));
}

export type GenderLabels = { male: string; female: string; unknown: string };

/** Map rows theo giới tính (0 Nữ / 1 Nam / null) sang shape chung. */
export function buildGenderBreakdownRows(
  rows: readonly GenderRevenueRow[],
  labels: GenderLabels,
): BreakdownRevenueRow[] {
  return rows.map(({ gender, ...rest }) => ({
    label: gender === 1 ? labels.male : gender === 0 ? labels.female : labels.unknown,
    ...rest,
  }));
}

export type DonutSliceDatum = { name: string; value: number };

/**
 * Rút gọn về tối đa `maxSlices` lát cho biểu đồ tròn: giữ các lát lớn nhất,
 * phần đuôi gộp vào một lát `otherLabel`. Bỏ lát giá trị 0 để tránh lát rỗng.
 */
export function buildDonutSlices(
  items: readonly DonutSliceDatum[],
  maxSlices: number,
  otherLabel: string,
): DonutSliceDatum[] {
  const positive = items.filter((item) => item.value > 0);
  const sorted = [...positive].sort((a, b) => b.value - a.value);
  if (sorted.length <= maxSlices) return sorted;
  const head = sorted.slice(0, maxSlices - 1);
  const otherValue = sorted.slice(maxSlices - 1).reduce((sum, item) => sum + item.value, 0);
  return otherValue > 0 ? [...head, { name: otherLabel, value: otherValue }] : head;
}
