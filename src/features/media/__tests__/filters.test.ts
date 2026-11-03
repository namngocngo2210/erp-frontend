import { describe, expect, it } from "vitest";

import {
  DEFAULT_FILTERS,
  filtersFromSearchParams,
  filtersToSearchParams,
} from "@/features/media/filters";

describe("content filters ↔ URLSearchParams", () => {
  it("round-trip giữ danh sách và bỏ giá trị mặc định", () => {
    const f = {
      ...DEFAULT_FILTERS,
      productIds: ["1", "5"],
      channelIds: ["2"],
      adRatings: ["4", "4.5"],
      uploadedFrom: "2026-09-01",
      uploadedTo: "2026-09-04",
      sort: "rating" as const,
      order: "desc" as const,
      page: 3,
      pageSize: 50,
    };
    const sp = filtersToSearchParams(f);
    expect(sp.getAll("product_id")).toEqual(["1", "5"]);
    expect(sp.get("uploaded_from")).toBe("2026-09-01");
    expect(sp.get("page")).toBe("3");
    expect(filtersFromSearchParams(sp)).toEqual(f);
  });
  it("mặc định → query rỗng; ad_rating bị bỏ khi không có channel_id", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
    const sp = filtersToSearchParams({ ...DEFAULT_FILTERS, adRatings: ["4"] });
    expect(sp.has("ad_rating")).toBe(false);
  });
  it("page_size ngoài 1..100 rơi về 20", () => {
    expect(filtersFromSearchParams(new URLSearchParams("page_size=500")).pageSize).toBe(20);
  });
});
