import { describe, expect, it } from "vitest";

import type { FoxiaReportRow } from "@/lib/api/foxia-report";

import {
  EMPTY_VALUE,
  formatCount,
  formatMoney,
  formatPct,
  formatRoas,
  hasSpendColumns,
  sortRows,
} from "../foxia-selectors";

function row(overrides: Partial<FoxiaReportRow>): FoxiaReportRow {
  return {
    key: "1",
    label: "Nguồn",
    mapped: true,
    orders: 0,
    delivered: 0,
    returned: 0,
    revenue: 0,
    collected: 0,
    ship_fee: 0,
    spend: 0,
    cpo: null,
    cps: null,
    delivery_rate: null,
    return_rate: null,
    roas: null,
    ...overrides,
  };
}

describe("định dạng giá trị không xác định", () => {
  // null = mẫu số bằng 0. Hiển thị "0" ở đây đọc như "quảng cáo miễn phí" —
  // khác hẳn sự thật là "chưa có dữ liệu để chia".
  it("trả dấu gạch cho null, không phải số 0", () => {
    expect(formatMoney(null)).toBe(EMPTY_VALUE);
    expect(formatPct(null)).toBe(EMPTY_VALUE);
    expect(formatRoas(null)).toBe(EMPTY_VALUE);
    expect(formatCount(null)).toBe(EMPTY_VALUE);
  });

  it("số 0 thật vẫn hiển thị là 0", () => {
    expect(formatCount(0)).toBe("0");
    expect(formatPct(0)).toBe("0.0%");
    expect(formatRoas(0)).toBe("0.00x");
  });

  it("ROAS có hậu tố x", () => {
    expect(formatRoas(3.456)).toBe("3.46x");
  });
});

describe("cột chi phí theo lát cắt", () => {
  // Tiền quảng cáo gắn với tài khoản Ads → chỉ quy được về nguồn/kênh.
  it("chỉ nguồn và kênh mới có cột chi phí", () => {
    expect(hasSpendColumns("source")).toBe(true);
    expect(hasSpendColumns("channel")).toBe(true);
    expect(hasSpendColumns("marketer")).toBe(false);
    expect(hasSpendColumns("branch")).toBe(false);
    expect(hasSpendColumns("brand")).toBe(false);
  });
});

describe("thứ tự dòng", () => {
  it("nhóm chưa ánh xạ luôn nằm cuối bảng", () => {
    const rows = [
      row({ key: "unmapped", mapped: false, orders: 999 }),
      row({ key: "a", orders: 5 }),
      row({ key: "b", orders: 50 }),
    ];

    expect(sortRows(rows).map((r) => r.key)).toEqual(["b", "a", "unmapped"]);
  });

  it("không sửa mảng gốc", () => {
    const rows = [row({ key: "a", orders: 1 }), row({ key: "b", orders: 9 })];
    sortRows(rows);
    expect(rows.map((r) => r.key)).toEqual(["a", "b"]);
  });
});
