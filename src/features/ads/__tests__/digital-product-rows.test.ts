import { describe, expect, it } from "vitest";

import {
  type DigitalMetricRow,
  type DigitalProductApiRow,
  buildDigitalProductRows,
  buildDigitalRows,
} from "../digital-report-selectors";
import type { DailyBreakdownRow } from "../report-grouping";

function apiRow(overrides: Partial<DigitalProductApiRow> = {}): DigitalProductApiRow {
  return {
    date: null,
    channel_id: 1,
    product_id: 10,
    product__sku: "DC30",
    product__name: "Bồn ngâm chân",
    revenue: "0",
    cost: "0",
    closed_orders: 0,
    leads: 0,
    ...overrides,
  };
}

/** Hàng cha lấy từ chính selector thật để không tự bịa ra chỉ số dẫn xuất. */
function parentRow(revenue: string, cost: string): DigitalMetricRow {
  const day: DailyBreakdownRow = {
    date: "2026-03-01",
    revenue,
    cost,
    closed_orders: 4,
    leads: 20,
    ratio_pct: null,
    channels: [
      {
        channel_id: 1,
        channel__code: "fb-1",
        channel__name: "Kênh A",
        revenue,
        cost,
        closed_orders: 4,
        leads: 20,
        ratio_pct: null,
      },
    ],
  };
  return buildDigitalRows([day])[0];
}

describe("buildDigitalProductRows", () => {
  it("chỉ lấy dòng của đúng kênh đang bung", () => {
    const rows = [
      apiRow({ revenue: "1000", cost: "300" }),
      apiRow({ channel_id: 2, product_id: 11, product__sku: "MSC06", cost: "500" }),
    ];

    const { rows: children } = buildDigitalProductRows(
      rows,
      parentRow("1000", "300"),
      { channelKey: "1" },
      "Chưa gán chiến dịch",
    );

    expect(children.map((row) => row.label)).toEqual(["DC30"]);
  });

  it("thêm dòng 'Chưa gán chiến dịch' để tổng chi phí khớp dòng cha", () => {
    const { rows: children } = buildDigitalProductRows(
      [apiRow({ revenue: "1000", cost: "300" })],
      parentRow("1000", "800"),
      { channelKey: "1" },
      "Chưa gán chiến dịch",
    );

    expect(children.map((row) => row.label)).toEqual(["DC30", "Chưa gán chiến dịch"]);
    expect(children.reduce((sum, row) => sum + row.cost, 0)).toBe(800);
    // Rổ chưa gán không mang doanh thu — mọi chỉ số dẫn xuất theo doanh thu là "—".
    expect(children[1].revenue).toBe(0);
    expect(children[1].meRePct).toBeNull();
  });

  it("không thêm dòng chưa gán khi đã quy hết chi phí về sản phẩm", () => {
    const { rows: children } = buildDigitalProductRows(
      [apiRow({ revenue: "1000", cost: "800" })],
      parentRow("1000", "800"),
      { channelKey: "1" },
      "Chưa gán chiến dịch",
    );

    expect(children).toHaveLength(1);
  });

  it("báo phần doanh thu của sản phẩm không có chiến dịch", () => {
    const { revenueGap } = buildDigitalProductRows(
      [apiRow({ revenue: "1000", cost: "800" })],
      parentRow("2500", "800"),
      { channelKey: "1" },
      "Chưa gán chiến dịch",
    );

    expect(revenueGap).toBe(1500);
  });

  it("lọc thêm theo ngày ở tab chi tiết", () => {
    const rows = [
      apiRow({ date: "2026-03-01", revenue: "1000", cost: "300" }),
      apiRow({ date: "2026-03-02", product_id: 11, product__sku: "MSC06", cost: "400" }),
    ];

    const parent = { ...parentRow("1000", "300"), key: "2026-03-01" };
    const { rows: children } = buildDigitalProductRows(
      rows,
      parent,
      { channelKey: "1", date: "2026-03-01" },
      "Chưa gán chiến dịch",
    );

    expect(children.map((row) => row.label)).toEqual(["DC30"]);
  });

  it("tính đủ các chỉ số dẫn xuất cho dòng sản phẩm", () => {
    const { rows: children } = buildDigitalProductRows(
      [apiRow({ revenue: "1000", cost: "200", closed_orders: 2, leads: 10 })],
      parentRow("1000", "200"),
      { channelKey: "1" },
      "Chưa gán chiến dịch",
    );

    const child = children[0];
    // Dòng con chỉ mang SKU — tên SP là đoạn mô tả dài, cố ý không hiện.
    expect(child.sublabel).toBe("");
    expect(child.meRePct).toBe(20);
    expect(child.cpl).toBe(20);
    expect(child.aov).toBe(500);
    expect(child.closeRatePct).toBe(20);
  });

  it("xếp sản phẩm theo doanh thu giảm dần", () => {
    const rows = [
      apiRow({ product_id: 10, product__sku: "DC30", revenue: "1000", cost: "100" }),
      apiRow({ product_id: 11, product__sku: "MSC06", revenue: "3000", cost: "100" }),
    ];

    const { rows: children } = buildDigitalProductRows(
      rows,
      parentRow("4000", "200"),
      { channelKey: "1" },
      "Chưa gán chiến dịch",
    );

    expect(children.map((row) => row.label)).toEqual(["MSC06", "DC30"]);
  });
});
