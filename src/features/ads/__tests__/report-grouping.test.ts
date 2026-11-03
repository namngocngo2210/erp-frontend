import { describe, expect, it } from "vitest";

import {
  type DailyBreakdownRow,
  type DailyChannelRow,
  computeDailyTotals,
  enumerateDates,
  formatMonthLabel,
  groupChannelDaysByMonth,
  groupDailyRowsByMonth,
  hasDailyActivity,
  prepareDailyRowsForTable,
  shouldGroupByMonth,
  sumCostByChannel,
} from "../report-grouping";

const day = (over: Partial<DailyBreakdownRow> = {}): DailyBreakdownRow => ({
  date: "2026-01-01",
  revenue: "0",
  cost: "0",
  closed_orders: 0,
  leads: 0,
  ratio_pct: null,
  channels: [],
  ...over,
});

describe("shouldGroupByMonth", () => {
  it("khoảng ngắn (tuần/tháng) hiển thị theo ngày", () => {
    expect(shouldGroupByMonth("2026-01-01", "2026-01-07", [])).toBe(false);
    expect(shouldGroupByMonth("2026-01-01", "2026-01-31", [])).toBe(false);
    // Đúng ngưỡng 62 ngày vẫn theo ngày.
    expect(shouldGroupByMonth("2026-01-01", "2026-03-03", [])).toBe(false);
  });

  it("khoảng dài (quý/năm) gộp theo tháng", () => {
    // 63 ngày — vượt ngưỡng.
    expect(shouldGroupByMonth("2026-01-01", "2026-03-04", [])).toBe(true);
    // Quý.
    expect(shouldGroupByMonth("2026-01-01", "2026-03-31", [])).toBe(true);
    // Năm.
    expect(shouldGroupByMonth("2026-01-01", "2026-12-31", [])).toBe(true);
  });

  it("custom thiếu mốc: tính span từ min/max ngày trong dữ liệu", () => {
    const rows = [day({ date: "2026-01-05" }), day({ date: "2026-05-20" })];
    expect(shouldGroupByMonth(undefined, undefined, rows)).toBe(true);
    const shortRows = [day({ date: "2026-01-05" }), day({ date: "2026-01-20" })];
    expect(shouldGroupByMonth("", "2026-01-20", shortRows)).toBe(false);
  });

  it("không có bộ lọc lẫn dữ liệu → theo ngày", () => {
    expect(shouldGroupByMonth(undefined, undefined, [])).toBe(false);
  });

  it("khoảng ngày không hợp lệ → theo ngày trừ khi dữ liệu dài", () => {
    expect(shouldGroupByMonth("2026-03-04", "2026-01-01", [])).toBe(false);
  });
});

describe("groupDailyRowsByMonth", () => {
  it("gộp theo tháng, cộng tổng và tính ratio", () => {
    const rows = [
      day({ date: "2026-01-10", revenue: "1000", cost: "100", closed_orders: 2 }),
      day({ date: "2026-01-20", revenue: "3000", cost: "200", closed_orders: 3 }),
      day({ date: "2026-02-01", revenue: "500", cost: "50", closed_orders: 1 }),
    ];
    const months = groupDailyRowsByMonth(rows);
    expect(months.map((m) => m.month)).toEqual(["2026-01", "2026-02"]);
    expect(months[0].revenue).toBe(4000);
    expect(months[0].cost).toBe(300);
    expect(months[0].closed_orders).toBe(5);
    expect(months[0].ratio_pct).toBeCloseTo(7.5);
    expect(months[0].days.map((d) => d.date)).toEqual(["2026-01-10", "2026-01-20"]);
  });

  it("ratio null khi doanh thu tháng bằng 0", () => {
    const months = groupDailyRowsByMonth([day({ date: "2026-01-10", cost: "100" })]);
    expect(months[0].ratio_pct).toBeNull();
  });

  it("giữ thứ tự đầu vào — chart truyền tăng dần, bảng truyền giảm dần", () => {
    const rows = [
      day({ date: "2026-03-01" }),
      day({ date: "2026-03-02" }),
      day({ date: "2026-04-01" }),
    ];
    // Chart: tăng dần vào, tăng dần ra (trục thời gian không được chạy ngược).
    expect(groupDailyRowsByMonth(rows).map((m) => m.month)).toEqual(["2026-03", "2026-04"]);
    // Bảng: đưa qua prepareDailyRowsForTable trước nên tháng/ngày đều giảm dần.
    const tableMonths = groupDailyRowsByMonth(
      prepareDailyRowsForTable(rows.map((r) => ({ ...r, revenue: "10" }))),
    );
    expect(tableMonths.map((m) => m.month)).toEqual(["2026-04", "2026-03"]);
    expect(tableMonths[1].days.map((d) => d.date)).toEqual(["2026-03-02", "2026-03-01"]);
  });
});

describe("hasDailyActivity", () => {
  it("ngày rỗng hoàn toàn là không phát sinh", () => {
    expect(hasDailyActivity(day({ date: "2026-01-01" }))).toBe(false);
  });

  it("chỉ cần một chỉ số khác 0 là có phát sinh", () => {
    expect(hasDailyActivity(day({ revenue: "1000" }))).toBe(true);
    expect(hasDailyActivity(day({ cost: "500" }))).toBe(true);
    expect(hasDailyActivity(day({ closed_orders: 1 }))).toBe(true);
    // Ngày chỉ có data mà chưa chốt đơn nào vẫn phải hiện.
    expect(hasDailyActivity(day({ leads: 3 }))).toBe(true);
  });
});

describe("prepareDailyRowsForTable", () => {
  it("bỏ ngày trống, ngày gần nhất lên đầu, không sửa mảng gốc", () => {
    const rows = [
      day({ date: "2026-01-01", revenue: "1000" }),
      day({ date: "2026-01-02" }),
      day({ date: "2026-01-03", cost: "200" }),
    ];
    const prepared = prepareDailyRowsForTable(rows);
    expect(prepared.map((r) => r.date)).toEqual(["2026-01-03", "2026-01-01"]);
    // Chart dùng chung mảng gốc nên thứ tự tăng dần phải còn nguyên.
    expect(rows.map((r) => r.date)).toEqual(["2026-01-01", "2026-01-02", "2026-01-03"]);
  });
});

describe("groupChannelDaysByMonth", () => {
  it("gộp days của pivot kênh theo tháng", () => {
    const months = groupChannelDaysByMonth([
      { date: "2026-01-01", revenue: 100, cost: 10, ratio_pct: 10 },
      { date: "2026-01-02", revenue: 300, cost: 30, ratio_pct: 10 },
      { date: "2026-02-01", revenue: 0, cost: 5, ratio_pct: null },
    ]);
    expect(months.map((m) => m.month)).toEqual(["2026-01", "2026-02"]);
    expect(months[0].revenue).toBe(400);
    expect(months[0].cost).toBe(40);
    expect(months[0].ratio_pct).toBeCloseTo(10);
    expect(months[1].ratio_pct).toBeNull();
    expect(months[0].days).toHaveLength(2);
  });

  it("ngày đã sort giảm dần trước khi gộp thì tháng cũng ra giảm dần", () => {
    const months = groupChannelDaysByMonth([
      { date: "2026-02-01", revenue: 50, cost: 5, ratio_pct: 10 },
      { date: "2026-01-02", revenue: 300, cost: 30, ratio_pct: 10 },
      { date: "2026-01-01", revenue: 100, cost: 10, ratio_pct: 10 },
    ]);
    expect(months.map((m) => m.month)).toEqual(["2026-02", "2026-01"]);
    expect(months[1].days.map((d) => d.date)).toEqual(["2026-01-02", "2026-01-01"]);
  });
});

describe("computeDailyTotals", () => {
  it("tổng doanh thu/chi phí và ratio toàn kỳ", () => {
    const totals = computeDailyTotals([
      day({ revenue: "1000", cost: "100" }),
      day({ date: "2026-01-02", revenue: "1000", cost: "300" }),
    ]);
    expect(totals.totalRevenue).toBe(2000);
    expect(totals.totalCost).toBe(400);
    expect(totals.totalRatioPct).toBeCloseTo(20);
  });

  it("ratio null khi không có doanh thu", () => {
    expect(computeDailyTotals([]).totalRatioPct).toBeNull();
  });
});

describe("sumCostByChannel", () => {
  const channel = (id: number | null, cost: string): DailyChannelRow => ({
    channel_id: id,
    channel__code: id == null ? null : `ch-${id}`,
    channel__name: id == null ? null : `Kênh ${id}`,
    revenue: "0",
    cost,
    closed_orders: 0,
    leads: 0,
    ratio_pct: null,
  });

  it("cộng dồn chi phí từng kênh qua nhiều ngày, bỏ qua channel_id null", () => {
    const map = sumCostByChannel([
      day({ date: "2026-01-01", channels: [channel(1, "100"), channel(2, "50")] }),
      day({ date: "2026-01-02", channels: [channel(1, "200"), channel(null, "999")] }),
    ]);
    expect(map.get(1)).toBe(300);
    expect(map.get(2)).toBe(50);
    expect(map.size).toBe(2);
  });
});

describe("formatMonthLabel", () => {
  it("YYYY-MM → MM/YYYY", () => {
    expect(formatMonthLabel("2026-03")).toBe("03/2026");
  });
});

describe("enumerateDates", () => {
  it("liệt kê ngày liên tục bao gồm 2 đầu", () => {
    expect(enumerateDates("2026-01-30", "2026-02-02")).toEqual([
      "2026-01-30",
      "2026-01-31",
      "2026-02-01",
      "2026-02-02",
    ]);
  });

  it("thiếu mốc hoặc from > to → rỗng", () => {
    expect(enumerateDates(undefined, "2026-01-01")).toEqual([]);
    expect(enumerateDates("2026-01-02", "2026-01-01")).toEqual([]);
  });
});
