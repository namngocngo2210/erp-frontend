import { describe, expect, it } from "vitest";

import type { OverviewTimeseriesPoint } from "@/lib/api/overview-report";
import { buildRevenueTimeseries, sumTimeseries } from "../timeseries-selectors";

const DAY_POINTS: OverviewTimeseriesPoint[] = [
  { bucket: "2026-08-01", sale_channel: "marketplace", revenue: "100000", orders: 2 },
  { bucket: "2026-08-01", sale_channel: "off_marketplace", revenue: "50000", orders: 1 },
  // 02/08 không có đơn — phải thành cột 0, không được biến mất khỏi trục.
  { bucket: "2026-08-03", sale_channel: "marketplace", revenue: "70000", orders: 1 },
];

describe("buildRevenueTimeseries — theo ngày", () => {
  it("dựng đủ mọi ngày trong kỳ, ngày không có đơn thành 0", () => {
    const chart = buildRevenueTimeseries(DAY_POINTS, "by_day", "", "", "2026-08-01", "2026-08-03");

    expect(chart.bars.map((b) => b.bucket)).toEqual(["2026-08-01", "2026-08-02", "2026-08-03"]);
    expect(chart.bars.map((b) => b.label)).toEqual(["01", "02", "03"]);
    expect(chart.bars[1]).toMatchObject({ marketplace: 0, off_marketplace: 0 });
    expect(chart.bars[2]).toMatchObject({ marketplace: 70000, off_marketplace: 0 });
  });

  it("KHÔNG lệch ngày vì múi giờ", () => {
    // Bẫy đã ghi ở docs: `new Date("2026-08-01")` parse theo UTC nên ở +7 lùi về
    // 31/07. Nếu enumerateDays dính bẫy đó, ô đầu tiên sẽ là "2026-07-31".
    const chart = buildRevenueTimeseries([], "by_day", "", "", "2026-08-01", "2026-08-02");
    expect(chart.bars[0]?.bucket ?? "").not.toBe("2026-07-31");
  });

  it("tổng biểu đồ bằng tổng payload — phải khớp ô KPI Doanh thu thuần", () => {
    const chart = buildRevenueTimeseries(DAY_POINTS, "by_day", "", "", "2026-08-01", "2026-08-03");
    expect(sumTimeseries(chart)).toBe(220000);
  });

  it("thiếu khoảng ngày → rơi về đúng bucket BE trả, không trắng biểu đồ", () => {
    const chart = buildRevenueTimeseries(DAY_POINTS, "by_day", "", "");
    expect(chart.bars.map((b) => b.bucket)).toEqual(["2026-08-01", "2026-08-03"]);
  });
});

describe("buildRevenueTimeseries — theo giờ và theo thứ", () => {
  it("theo giờ luôn đủ 24 cột, nhãn dạng 07h", () => {
    const chart = buildRevenueTimeseries(
      [{ bucket: "7", sale_channel: "marketplace", revenue: "1000", orders: 1 }],
      "by_hour",
      "",
      "",
    );

    expect(chart.bars).toHaveLength(24);
    expect(chart.bars[0].label).toBe("00h");
    expect(chart.bars[7]).toMatchObject({ label: "07h", marketplace: 1000 });
    expect(chart.bars[23].label).toBe("23h");
  });

  it("theo thứ đủ 7 cột, isoweekday 1 = Thứ 2 và 7 = Chủ nhật", () => {
    const chart = buildRevenueTimeseries(
      [{ bucket: "7", sale_channel: "marketplace", revenue: "9000", orders: 1 }],
      "by_weekday",
      "",
      "",
    );

    expect(chart.bars).toHaveLength(7);
    expect(chart.bars[0].label).toBe("Thứ 2");
    expect(chart.bars[6]).toMatchObject({ label: "Chủ nhật", marketplace: 9000 });
  });
});

describe("buildRevenueTimeseries — nhóm theo tầng", () => {
  it("giữ đúng thứ tự nhóm của tầng đang lọc", () => {
    const points: OverviewTimeseriesPoint[] = [
      { bucket: "9", sale_channel: "off_other", revenue: "10", orders: 1 },
      { bucket: "9", sale_channel: "facebook", revenue: "20", orders: 1 },
      { bucket: "9", sale_channel: "web", revenue: "30", orders: 1 },
    ];
    const chart = buildRevenueTimeseries(points, "by_hour", "off_marketplace", "");
    expect(chart.series).toEqual(["facebook", "web", "off_other"]);
  });

  it("bỏ nhóm không có số khỏi legend", () => {
    const points: OverviewTimeseriesPoint[] = [
      { bucket: "9", sale_channel: "shopee", revenue: "10", orders: 1 },
    ];
    const chart = buildRevenueTimeseries(points, "by_hour", "marketplace", "");
    // TikTok thuộc tầng nhưng kỳ này không có đơn → không vào legend.
    expect(chart.series).toEqual(["shopee"]);
  });

  it("payload rỗng → không series nào, biểu đồ hiện thông báo rỗng", () => {
    const chart = buildRevenueTimeseries(undefined, "by_day", "", "", "2026-08-01", "2026-08-02");
    expect(chart.series).toEqual([]);
    expect(sumTimeseries(chart)).toBe(0);
  });
});

describe("buildRevenueTimeseries — lọc ô Kênh bán", () => {
  const OFF_POINTS: OverviewTimeseriesPoint[] = [
    { bucket: "9", sale_channel: "facebook", revenue: "20", orders: 1 },
    { bucket: "9", sale_channel: "web", revenue: "30", orders: 1 },
  ];

  it("chọn một kênh thì chỉ còn đúng series đó", () => {
    const chart = buildRevenueTimeseries(OFF_POINTS, "by_hour", "off_marketplace", "web");
    expect(chart.series).toEqual(["web"]);
  });

  it("kênh không thuộc tầng của Nguồn bị bỏ qua — về lại cả tầng", () => {
    // BE cũng bỏ qua tổ hợp mâu thuẫn này; hai phía phải cư xử giống nhau.
    const chart = buildRevenueTimeseries(OFF_POINTS, "by_hour", "off_marketplace", "shopee");
    expect(chart.series).toEqual(["facebook", "web"]);
  });
});

describe("buildRevenueTimeseries — line tổng và % thay đổi", () => {
  it("mỗi cột có `total` = tổng các nhóm, nuôi line xu hướng", () => {
    const chart = buildRevenueTimeseries(DAY_POINTS, "by_day", "", "", "2026-08-01", "2026-08-03");
    expect(chart.bars.map((b) => b.total)).toEqual([150000, 0, 70000]);
  });

  it("changePct so với cột liền trước; cột đầu và cột sau cột 0 là null (không chia 0)", () => {
    const points: OverviewTimeseriesPoint[] = [
      { bucket: "2026-08-01", sale_channel: "marketplace", revenue: "100000", orders: 1 },
      { bucket: "2026-08-02", sale_channel: "marketplace", revenue: "125000", orders: 1 },
      { bucket: "2026-08-03", sale_channel: "marketplace", revenue: "100000", orders: 1 },
      // 04/08 = 0 → 05/08 không có % dù có tiền.
      { bucket: "2026-08-05", sale_channel: "marketplace", revenue: "50000", orders: 1 },
    ];
    const chart = buildRevenueTimeseries(points, "by_day", "", "", "2026-08-01", "2026-08-05");
    expect(chart.bars.map((b) => b.changePct)).toEqual([null, 25, -20, -100, null]);
  });

  it("`total` không lẫn vào series (line không thành một lát cột)", () => {
    const chart = buildRevenueTimeseries(DAY_POINTS, "by_day", "", "", "2026-08-01", "2026-08-03");
    expect(chart.series).not.toContain("total");
    // Tổng biểu đồ vẫn tính từ các nhóm, không đội đôi vì có thêm `total`.
    expect(sumTimeseries(chart)).toBe(220000);
  });
});
