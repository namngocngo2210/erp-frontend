import { describe, expect, it } from "vitest";

import { hasRevenueColumns, sortRowsByCost } from "@/lib/api/facebook_ads_page_report";
import type { PageCostRow } from "@/lib/api/facebook_ads_page_report";

const row = (overrides: Partial<PageCostRow>): PageCostRow => ({
  page_id: "1",
  page_name: "Page",
  cost: "0",
  impressions: 0,
  clicks: 0,
  revenue: null,
  closed_orders: null,
  ratio_pct: null,
  ...overrides,
});

describe("hasRevenueColumns", () => {
  it("ẩn cột doanh thu khi chưa go-live", () => {
    expect(hasRevenueColumns(null)).toBe(false);
  });

  it("hiện cột doanh thu khi đã có mốc", () => {
    expect(hasRevenueColumns("2026-08-15")).toBe(true);
  });
});

describe("sortRowsByCost", () => {
  it("xếp theo chi phí giảm dần", () => {
    const rows = [row({ page_id: "a", cost: "10" }), row({ page_id: "b", cost: "50" })];
    expect(sortRowsByCost(rows).map((r) => r.page_id)).toEqual(["b", "a"]);
  });

  it("luôn đẩy dòng không rõ page xuống cuối", () => {
    const rows = [row({ page_id: "", cost: "999" }), row({ page_id: "a", cost: "10" })];
    expect(sortRowsByCost(rows).map((r) => r.page_id)).toEqual(["a", ""]);
  });
});
