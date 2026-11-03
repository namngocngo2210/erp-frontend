import { describe, expect, it } from "vitest";

import type { DailyBreakdownRow } from "../report-grouping";
import {
  buildChannelRevenueChartData,
  buildChannelStackChartData,
  buildDailyTrendChartData,
  buildDonutSlices,
  buildGenderBreakdownRows,
  buildProvinceBreakdownRows,
  buildTopProductsChartData,
  computeAdsKpis,
  type AdsReportPayload,
} from "../ads-report-selectors";

const CHANNEL_ROWS: AdsReportPayload["revenue_by_channel"] = [
  {
    channel_id: 1,
    channel__code: "fb-1",
    channel__name: "Kênh A",
    closed_orders: 2,
    revenue: "1000",
    delivered_orders: 1,
    delivered_revenue: "600",
  },
  {
    channel_id: 2,
    channel__code: "fb-2",
    channel__name: "Kênh B",
    closed_orders: 5,
    revenue: "3000",
    delivered_orders: 4,
    delivered_revenue: "2500",
  },
];

const DAILY_ROWS: DailyBreakdownRow[] = [
  {
    date: "2026-01-10",
    revenue: "1000",
    cost: "100",
    closed_orders: 2,
    leads: 2,
    ratio_pct: 10,
    channels: [
      {
        channel_id: 1,
        channel__code: "fb-1",
        channel__name: "Kênh A",
        revenue: "1000",
        cost: "100",
        closed_orders: 2,
        leads: 2,
        ratio_pct: 10,
      },
      {
        channel_id: 99,
        channel__code: "x",
        channel__name: "Ngoài",
        revenue: "0",
        cost: "500",
        closed_orders: 0,
        leads: 0,
        ratio_pct: null,
      },
    ],
  },
  {
    date: "2026-02-05",
    revenue: "3000",
    cost: "600",
    closed_orders: 5,
    leads: 5,
    ratio_pct: 20,
    channels: [
      {
        channel_id: 2,
        channel__code: "fb-2",
        channel__name: "Kênh B",
        revenue: "3000",
        cost: "600",
        closed_orders: 5,
        leads: 5,
        ratio_pct: 20,
      },
    ],
  },
];

describe("computeAdsKpis", () => {
  it("totals only over channels present in channelRows and matches tfoot", () => {
    const kpis = computeAdsKpis(CHANNEL_ROWS, DAILY_ROWS);
    expect(kpis.totalRevenue).toBe(4000);
    // cost for channel 1 (100) + channel 2 (600); channel 99 excluded
    expect(kpis.totalCost).toBe(700);
    expect(kpis.ratioPct).toBeCloseTo(17.5);
    expect(kpis.closedOrders).toBe(7);
    expect(kpis.deliveredOrders).toBe(5);
    expect(kpis.deliveredRevenue).toBe(3100);
  });

  it("ratioPct is null when revenue is 0", () => {
    expect(computeAdsKpis([], []).ratioPct).toBeNull();
  });
});

describe("buildChannelRevenueChartData", () => {
  it("sorts by revenue desc and carries closed orders + ratio", () => {
    const data = buildChannelRevenueChartData(CHANNEL_ROWS, DAILY_ROWS);
    expect(data.map((d) => d.name)).toEqual(["Kênh B", "Kênh A"]);
    expect(data[0].revenue).toBe(3000);
    expect(data[1].ratioPct).toBeCloseTo(10); // 100/1000
  });
});

describe("buildDailyTrendChartData", () => {
  it("returns per-day rows when not grouping", () => {
    const data = buildDailyTrendChartData(DAILY_ROWS, false);
    expect(data.map((d) => d.label)).toEqual(["2026-01-10", "2026-02-05"]);
    expect(data[0]).toMatchObject({ revenue: 1000, cost: 100 });
  });

  it("groups by month with MM/YYYY labels when grouping", () => {
    const data = buildDailyTrendChartData(DAILY_ROWS, true);
    expect(data.map((d) => d.label)).toEqual(["01/2026", "02/2026"]);
    expect(data[0]).toMatchObject({ revenue: 1000, cost: 100, ratioPct: 10 });
  });
});

describe("buildTopProductsChartData", () => {
  it("takes first N and derives name/revenue/closedOrders", () => {
    const products: AdsReportPayload["top_products"] = [
      {
        product_id: 1,
        product__name: "P1",
        product__sku: "SKU1",
        closed_orders: 9,
        quantity: 9,
        revenue: "900",
        delivered_orders: 4,
        delivered_revenue: "400",
        channels: [],
      },
      {
        product_id: 2,
        product__name: "P2",
        product__sku: null,
        closed_orders: 4,
        quantity: 4,
        revenue: "400",
        delivered_orders: 0,
        delivered_revenue: "0",
        channels: [],
      },
    ];
    const data = buildTopProductsChartData(products, 1);
    expect(data).toEqual([{ name: "SKU1", revenue: 900, closedOrders: 9 }]);
  });
});

describe("buildChannelStackChartData", () => {
  it("emits one numeric key per channel and per-day labels", () => {
    const rows: DailyBreakdownRow[] = [
      {
        date: "2026-01-10",
        revenue: "1000",
        cost: "100",
        closed_orders: 2,
        leads: 2,
        ratio_pct: 10,
        channels: [
          {
            channel_id: 1,
            channel__code: "fb-1",
            channel__name: "Kênh A",
            revenue: "1000",
            cost: "100",
            closed_orders: 2,
            leads: 2,
            ratio_pct: 10,
          },
        ],
      },
    ];
    const { data, series } = buildChannelStackChartData(rows, false);
    expect(series).toEqual([{ key: "ch_1", name: "Kênh A" }]);
    expect(data[0]).toMatchObject({ label: "2026-01-10", ch_1: 1000 });
  });

  it("aggregates per month with MM/YYYY labels when grouping", () => {
    const { data } = buildChannelStackChartData(DAILY_ROWS, true);
    expect(data.map((d) => d.label)).toEqual(["01/2026", "02/2026"]);
    expect(data[0]).toMatchObject({ ch_1: 1000, ch_2: 0 });
  });
});

describe("buildDonutSlices", () => {
  it("keeps every slice when they fit under the cap, sorted desc", () => {
    const slices = buildDonutSlices(
      [
        { name: "A", value: 10 },
        { name: "B", value: 30 },
      ],
      5,
      "Khác",
    );
    expect(slices).toEqual([
      { name: "B", value: 30 },
      { name: "A", value: 10 },
    ]);
  });

  it("folds the tail into a single 'Khác' slice and drops zero slices", () => {
    const slices = buildDonutSlices(
      [
        { name: "A", value: 50 },
        { name: "B", value: 30 },
        { name: "C", value: 20 },
        { name: "D", value: 5 },
        { name: "E", value: 0 },
      ],
      3,
      "Khác",
    );
    expect(slices).toEqual([
      { name: "A", value: 50 },
      { name: "B", value: 30 },
      { name: "Khác", value: 25 },
    ]);
  });
});

describe("buildProvinceBreakdownRows", () => {
  it("keeps the province label and maps null to the unknown label", () => {
    const rows = buildProvinceBreakdownRows(
      [
        {
          province: "Hà Nội",
          closed_orders: 2,
          revenue: "150000",
          delivered_orders: 1,
          delivered_revenue: "100000",
        },
        {
          province: null,
          closed_orders: 1,
          revenue: "30000",
          delivered_orders: 0,
          delivered_revenue: "0",
        },
      ],
      "Không rõ",
    );
    expect(rows.map((r) => r.label)).toEqual(["Hà Nội", "Không rõ"]);
    expect(rows[0]).toMatchObject({ closed_orders: 2, revenue: "150000" });
  });
});

describe("buildGenderBreakdownRows", () => {
  it("maps gender codes to display labels", () => {
    const rows = buildGenderBreakdownRows(
      [
        {
          gender: 1,
          closed_orders: 2,
          revenue: "170000",
          delivered_orders: 1,
          delivered_revenue: "100000",
        },
        {
          gender: 0,
          closed_orders: 1,
          revenue: "50000",
          delivered_orders: 0,
          delivered_revenue: "0",
        },
        {
          gender: null,
          closed_orders: 1,
          revenue: "20000",
          delivered_orders: 0,
          delivered_revenue: "0",
        },
      ],
      { male: "Nam", female: "Nữ", unknown: "Không rõ" },
    );
    expect(rows.map((r) => r.label)).toEqual(["Nam", "Nữ", "Không rõ"]);
  });
});
