import type { DailyBreakdownRow, DailyChannelRow } from "../report-grouping";
import type { TopProductRow } from "../ads-report-selectors";

export function makeDailyChannelRow(overrides: Partial<DailyChannelRow> = {}): DailyChannelRow {
  return {
    channel_id: 1,
    channel__code: "fb-1",
    channel__name: "Kênh A",
    revenue: "1000",
    cost: "100",
    closed_orders: 2,
    leads: 2,
    ratio_pct: 10,
    ...overrides,
  };
}

export function makeDailyBreakdownRow(
  overrides: Partial<DailyBreakdownRow> = {},
): DailyBreakdownRow {
  return {
    date: "2026-01-10",
    revenue: "1000",
    cost: "100",
    closed_orders: 2,
    leads: 2,
    ratio_pct: 10,
    channels: [],
    ...overrides,
  };
}

export function makeTopProductRow(overrides: Partial<TopProductRow> = {}): TopProductRow {
  return {
    product_id: 1,
    product__name: "P1",
    product__sku: "SKU1",
    closed_orders: 9,
    quantity: 9,
    revenue: "900",
    delivered_orders: 4,
    delivered_revenue: "400",
    channels: [],
    ...overrides,
  };
}
