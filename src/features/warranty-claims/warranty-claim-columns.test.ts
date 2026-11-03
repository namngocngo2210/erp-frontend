import { describe, expect, it } from "vitest";

import { columnDisplayValue, formatDaysLeft } from "./warranty-claim-columns";
import type { WarrantyClaim } from "./warranty-claim-types";

const base = {
  id: 1,
  status: 1,
  status_label: "Đang xử lý",
  journeys: [],
  order: {},
} as unknown as WarrantyClaim;

describe("cột thời hạn bảo hành", () => {
  it("chưa kích hoạt → gạch ngang ở cả 3 cột", () => {
    const row = {
      ...base,
      activation_date: null,
      expiry_date: null,
      warranty_days_left: null,
    } as WarrantyClaim;
    expect(columnDisplayValue(row, "activation_date")).toBe("—");
    expect(columnDisplayValue(row, "expiry_date")).toBe("—");
    expect(columnDisplayValue(row, "warranty_days_left")).toBe("—");
  });

  it("còn hạn → hiện số ngày còn lại", () => {
    const row = {
      ...base,
      activation_date: "2026-01-15",
      expiry_date: "2028-01-15",
      warranty_days_left: 540,
    } as WarrantyClaim;
    expect(columnDisplayValue(row, "warranty_days_left")).toBe("540 ngày");
    expect(columnDisplayValue(row, "expiry_date")).toBe(
      new Date("2028-01-15").toLocaleDateString("vi-VN"),
    );
  });

  it("quá hạn → Hết hạn", () => {
    const row = {
      ...base,
      activation_date: "2018-01-15",
      expiry_date: "2020-01-15",
      warranty_days_left: -12,
    } as WarrantyClaim;
    expect(columnDisplayValue(row, "warranty_days_left")).toBe("Hết hạn");
  });

  it("formatDaysLeft: hết hạn đúng ngày (0) cũng là Hết hạn", () => {
    expect(formatDaysLeft(0)).toBe("Hết hạn");
    expect(formatDaysLeft(1)).toBe("1 ngày");
    expect(formatDaysLeft(null)).toBe("—");
  });
});
