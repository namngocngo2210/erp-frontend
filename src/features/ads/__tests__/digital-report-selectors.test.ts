import { describe, expect, it } from "vitest";

import type { DailyBreakdownRow } from "../report-grouping";
import {
  buildDigitalDailyRows,
  buildDigitalRows,
  listDigitalOptions,
  monthRange,
  sumDigitalRows,
} from "../digital-report-selectors";

function channel(
  overrides: Partial<DailyBreakdownRow["channels"][number]> = {},
): DailyBreakdownRow["channels"][number] {
  return {
    channel_id: 1,
    channel__code: "fb-1",
    channel__name: "Kênh A",
    revenue: "0",
    cost: "0",
    closed_orders: 0,
    leads: 0,
    ratio_pct: null,
    ...overrides,
  };
}

function day(date: string, channels: DailyBreakdownRow["channels"]): DailyBreakdownRow {
  return { date, revenue: "0", cost: "0", closed_orders: 0, leads: 0, ratio_pct: null, channels };
}

const ROWS: DailyBreakdownRow[] = [
  day("2026-03-01", [
    channel({ revenue: "1000", cost: "200", closed_orders: 2, leads: 8 }),
    channel({
      channel_id: 2,
      channel__code: "fb-2",
      channel__name: "Kênh B",
      revenue: "500",
      cost: "250",
      closed_orders: 1,
      leads: 5,
    }),
  ]),
  day("2026-03-02", [channel({ revenue: "3000", cost: "600", closed_orders: 3, leads: 12 })]),
];

describe("buildDigitalRows", () => {
  it("gộp mọi ngày về một hàng cho mỗi kênh", () => {
    const rows = buildDigitalRows(ROWS);
    expect(rows.map((r) => r.label)).toEqual(["Kênh A", "Kênh B"]); // doanh thu giảm dần

    const a = rows[0];
    expect(a.revenue).toBe(4000);
    expect(a.cost).toBe(800);
    expect(a.leads).toBe(20);
    expect(a.orders).toBe(5);
  });

  it("tính đúng ME/RE, CPL, AOV và tỉ lệ chốt", () => {
    const [a] = buildDigitalRows(ROWS);
    expect(a.meRePct).toBeCloseTo(20); // 800 / 4000
    expect(a.cpl).toBe(40); // 800 / 20
    expect(a.aov).toBe(800); // 4000 / 5
    expect(a.closeRatePct).toBeCloseTo(25); // 5 / 20
  });

  it("trả null (không phải 0) cho chỉ số có mẫu số bằng 0", () => {
    const rows = buildDigitalRows([day("2026-03-01", [channel({ cost: "100" })])]);
    expect(rows[0].meRePct).toBeNull();
    expect(rows[0].cpl).toBeNull();
    expect(rows[0].aov).toBeNull();
    expect(rows[0].closeRatePct).toBeNull();
  });

  it("giữ kênh chỉ có data mà chưa có đơn chốt", () => {
    const rows = buildDigitalRows([day("2026-03-01", [channel({ leads: 4 })])]);
    expect(rows).toHaveLength(1);
    expect(rows[0].leads).toBe(4);
    expect(rows[0].orders).toBe(0);
    expect(rows[0].closeRatePct).toBe(0);
  });
});

describe("buildDigitalDailyRows", () => {
  it("chỉ liệt kê ngày có phát sinh, ngày gần nhất lên đầu", () => {
    const rows = buildDigitalDailyRows(ROWS, "1");
    expect(rows.map((r) => r.label)).toEqual(["2026-03-02", "2026-03-01"]);
    expect(rows[0].revenue).toBe(3000);
    expect(rows[1].revenue).toBe(1000);
  });

  it("chỉ lấy số liệu của kênh được chọn", () => {
    const rows = buildDigitalDailyRows(ROWS, "2");
    // Kênh B chỉ phát sinh ngày 01 → ngày 02 không xuất hiện.
    expect(rows.map((r) => r.label)).toEqual(["2026-03-01"]);
    expect(rows[0].revenue).toBe(500);
  });

  it("bỏ ngày mọi chỉ số bằng 0 nhưng giữ ngày chỉ có data", () => {
    const rows = buildDigitalDailyRows(
      [
        day("2026-03-01", [channel({ leads: 4 })]),
        day("2026-03-02", [channel()]),
        day("2026-03-03", [channel({ cost: "150" })]),
      ],
      "1",
    );
    expect(rows.map((r) => r.label)).toEqual(["2026-03-03", "2026-03-01"]);
  });
});

describe("sumDigitalRows", () => {
  it("dòng Tổng cộng đúng và tính lại tỉ lệ trên tổng, không cộng dồn phần trăm", () => {
    const rows = buildDigitalRows(ROWS);
    const total = sumDigitalRows(rows, "Tổng");
    expect(total.revenue).toBe(4500);
    expect(total.cost).toBe(1050);
    expect(total.leads).toBe(25);
    expect(total.orders).toBe(6);
    expect(total.meRePct).toBeCloseTo((1050 / 4500) * 100);
    expect(total.closeRatePct).toBeCloseTo((6 / 25) * 100);
  });
});

describe("listDigitalOptions", () => {
  it("liệt kê kênh không trùng, sắp theo tên", () => {
    expect(listDigitalOptions(ROWS)).toEqual([
      { value: "1", label: "Kênh A" },
      { value: "2", label: "Kênh B" },
    ]);
  });
});

describe("monthRange", () => {
  it("trả mốc đầu/cuối tháng, xử lý được tháng 2 năm nhuận", () => {
    expect(monthRange("2026-03")).toEqual({ from: "2026-03-01", to: "2026-03-31" });
    expect(monthRange("2026-02")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(monthRange("2024-02")).toEqual({ from: "2024-02-01", to: "2024-02-29" });
  });
});
