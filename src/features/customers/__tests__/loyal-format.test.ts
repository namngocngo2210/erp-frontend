import { describe, expect, it } from "vitest";

import type { LoyalCustomer } from "@/lib/api/customers";
import {
  ALL_CATEGORIES,
  ALL_SEGMENTS,
  buildLoyalListParams,
  buildNotePayload,
  clampPageSize,
  daysSinceClassName,
  formatChannels,
  formatDaysSince,
  formatProductLabel,
  noteFormFromRow,
  segmentLabel,
  staffLabel,
  toDateInputValue,
} from "@/features/customers/loyal/loyal-format";

describe("clampPageSize", () => {
  it("kẹp [1, 100], giá trị lỗi → 100", () => {
    expect(clampPageSize(20)).toBe(20);
    expect(clampPageSize(500)).toBe(100);
    expect(clampPageSize(Number.NaN)).toBe(100);
    expect(clampPageSize(0)).toBe(100);
  });
});

describe("buildLoyalListParams", () => {
  it("ALL → undefined, offset theo trang, range rỗng → undefined", () => {
    expect(
      buildLoyalListParams({
        currentPage: 2,
        pageSize: 20,
        range: null,
        segment: ALL_SEGMENTS,
        category: ALL_CATEGORIES,
      }),
    ).toEqual({
      limit: 20,
      offset: 20,
      dateFrom: undefined,
      dateTo: undefined,
      segment: undefined,
      category: undefined,
    });
    expect(
      buildLoyalListParams({
        currentPage: 1,
        pageSize: 50,
        range: { from: "2026-09-01", to: "" },
        segment: "S3",
        category: "12",
      }),
    ).toMatchObject({ dateFrom: "2026-09-01", dateTo: undefined, segment: "S3", category: "12" });
  });
});

describe("định dạng", () => {
  it("ngày kể từ mua cuối + màu theo ngưỡng", () => {
    expect(formatDaysSince(null)).toBe("-");
    expect(formatDaysSince(12)).toBe("12 ngày");
    expect(daysSinceClassName(null)).toContain("bg-muted");
    expect(daysSinceClassName(200)).toContain("red");
    expect(daysSinceClassName(100)).toContain("orange");
    expect(daysSinceClassName(40)).toContain("amber");
    expect(daysSinceClassName(5)).toContain("emerald");
  });

  it("kênh, sản phẩm, phân khúc, nhân viên, ngày input", () => {
    expect(formatChannels([])).toBe("-");
    expect(formatChannels(["FB", "Zalo"])).toBe("FB / Zalo");
    expect(formatProductLabel({ sku: "BNC02", quantity: 2 } as never)).toBe("BNC02 (SL: 2)");
    expect(segmentLabel({ segment_code: "", segment_name: "x" } as LoyalCustomer)).toBe("");
    expect(segmentLabel({ segment_code: "S1", segment_name: "" } as LoyalCustomer)).toBe("S1");
    expect(segmentLabel({ segment_code: "S1", segment_name: "VIP" } as LoyalCustomer)).toBe(
      "S1 - VIP",
    );
    expect(staffLabel({ id: 1, username: "u", display_name: "" } as never)).toBe("u");
    expect(toDateInputValue("2026-09-25T10:00:00Z")).toBe("2026-09-25");
    expect(toDateInputValue(null)).toBe("");
  });
});

describe("ghi chú", () => {
  const row = {
    sale_action: null,
    special_note: "VIP",
    sale_staff_id: 7,
    last_care_call_at: "2026-09-20T08:00:00Z",
  } as unknown as LoyalCustomer;

  it("form lấy từ dòng", () => {
    expect(noteFormFromRow(row)).toEqual({
      sale_action: "",
      special_note: "VIP",
      sale_staff_id: "7",
      last_care_call_at: "2026-09-20",
    });
  });

  it("chỉ gửi sale_staff_id khi có quyền đổi sale", () => {
    const form = noteFormFromRow(row);
    expect(buildNotePayload(form, false)).toEqual({
      sale_action: "",
      special_note: "VIP",
      last_care_call_at: "2026-09-20",
    });
    expect(buildNotePayload({ ...form, sale_staff_id: "" }, true)).toMatchObject({
      sale_staff_id: null,
    });
    expect(buildNotePayload({ ...form, last_care_call_at: "" }, true)).toMatchObject({
      sale_staff_id: 7,
      last_care_call_at: null,
    });
  });
});
