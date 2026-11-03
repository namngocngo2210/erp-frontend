import { describe, expect, it } from "vitest";

import type { ResaleTrackingRow } from "@/lib/api/customers";
import {
  clampPageSize,
  contactCount,
  contactStatusLabel,
  daysChipClass,
  daysFilterLabel,
  formatCurrency,
  formatDate,
  formatShortCurrency,
  fromDateTimeLocalValue,
  nextContactNo,
  saleInitial,
  segmentBadgeClass,
  toDateTimeLocalValue,
} from "@/features/customers/resale-format";

// Chỉ cần 3 mốc liên hệ cho contactCount/nextContactNo.
const row = (c1: string | null, c2: string | null, c3: string | null) =>
  ({ contact_1_at: c1, contact_2_at: c2, contact_3_at: c3 }) as ResaleTrackingRow;

describe("clampPageSize", () => {
  it("kẹp trong [1, 100] và cắt phần thập phân", () => {
    expect(clampPageSize(42)).toBe(42);
    expect(clampPageSize(3.9)).toBe(3);
    expect(clampPageSize(250)).toBe(100);
  });

  it("giá trị không hợp lệ rơi về 50", () => {
    expect(clampPageSize(Number.NaN)).toBe(50);
    expect(clampPageSize(0)).toBe(50);
    expect(clampPageSize(-5)).toBe(50);
  });
});

describe("formatCurrency", () => {
  it("số dạng chuỗi → nhóm nghìn vi-VN", () => {
    expect(formatCurrency("1234567")).toBe("1.234.567");
  });

  it("chuỗi rỗng → fallback '-'", () => {
    expect(formatCurrency("")).toBe("-");
  });
});

describe("formatShortCurrency", () => {
  it("rút gọn triệu: 1 chữ số lẻ dưới 10tr, tròn từ 10tr", () => {
    expect(formatShortCurrency(1_500_000)).toBe("1.5tr");
    expect(formatShortCurrency(15_000_000)).toBe("15tr");
  });

  it("0 hoặc âm → '0'", () => {
    expect(formatShortCurrency(0)).toBe("0");
    expect(formatShortCurrency(-1)).toBe("0");
  });
});

describe("formatDate", () => {
  it("null hoặc chuỗi hỏng → '-'", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate("not-a-date")).toBe("-");
  });

  it("ngày hợp lệ → định dạng vi-VN", () => {
    // Dựng mốc bằng Date local để không phụ thuộc múi giờ máy chạy test.
    const local = new Date(2026, 0, 15, 12, 0);
    expect(formatDate(local.toISOString())).toMatch(/^15\/0?1\/2026$/);
  });
});

describe("toDateTimeLocalValue / fromDateTimeLocalValue", () => {
  it("round-trip theo giờ local", () => {
    const local = new Date(2026, 6, 5, 9, 7);
    expect(toDateTimeLocalValue(local.toISOString())).toBe("2026-07-05T09:07");
    expect(fromDateTimeLocalValue("2026-07-05T09:07")).toBe(local.toISOString());
  });

  it("chuỗi hỏng → chuỗi rỗng", () => {
    expect(toDateTimeLocalValue("not-a-date")).toBe("");
    expect(fromDateTimeLocalValue("")).toBe("");
  });
});

describe("contactCount / nextContactNo", () => {
  it("đếm mốc đã có và trả mốc kế tiếp", () => {
    expect(contactCount(row(null, null, null))).toBe(0);
    expect(nextContactNo(row(null, null, null))).toBe(1);
    expect(contactCount(row("2026-01-01", null, null))).toBe(1);
    expect(nextContactNo(row("2026-01-01", null, null))).toBe(2);
    expect(nextContactNo(row("2026-01-01", "2026-01-02", null))).toBe(3);
    expect(contactCount(row("2026-01-01", "2026-01-02", "2026-01-03"))).toBe(3);
    expect(nextContactNo(row("2026-01-01", "2026-01-02", "2026-01-03"))).toBeNull();
  });
});

describe("badge/chip class", () => {
  it("segment lạ rơi về muted", () => {
    expect(segmentBadgeClass("S3")).toContain("teal");
    expect(segmentBadgeClass("S9")).toContain("bg-muted");
  });

  it("daysChipClass theo ngưỡng 60/180", () => {
    expect(daysChipClass(null)).toContain("bg-muted");
    expect(daysChipClass(30)).toContain("teal");
    expect(daysChipClass(90)).toContain("amber");
    expect(daysChipClass(200)).toContain("red");
  });
});

describe("nhãn hiển thị", () => {
  it("saleInitial lấy chữ cái đầu, rỗng → '?'", () => {
    expect(saleInitial("  hà ")).toBe("H");
    expect(saleInitial("   ")).toBe("?");
  });

  it("contactStatusLabel / daysFilterLabel có fallback", () => {
    expect(contactStatusLabel("none")).toBe("Chưa liên hệ");
    expect(contactStatusLabel("__all__")).toBe("Tất cả trạng thái");
    expect(daysFilterLabel("180")).toBe("Ngủ đông +180 ngày");
    expect(daysFilterLabel("__all__")).toBe("Tất cả");
  });
});
